#!/usr/bin/env python3
"""Official fail-closed customer-package entrypoint with signed entitlement checks."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
from typing import Any, Mapping


BASE_PATH = Path(__file__).with_name("customer-package.py")
SPEC = importlib.util.spec_from_file_location("local_ai_os_customer_package_base", BASE_PATH)
if SPEC is None or SPEC.loader is None:
  raise RuntimeError("cannot load customer package base module")
base = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(base)

TRUST_DIR = ".release-trust"
TRUST_RECEIPT = "verification.json"
TRUST_SCHEMA = "2026-08-30.local-ai-os-installed-trust.v1"


def _real_file(path: Path, label: str) -> Path:
  if path.is_symlink():
    raise base.PackageError(f"{label} must not be a symlink")
  try:
    resolved = path.resolve(strict=True)
  except (OSError, RuntimeError) as exc:
    raise base.PackageError(f"{label} is unavailable") from exc
  if not resolved.is_file():
    raise base.PackageError(f"{label} must be a regular file")
  return resolved


def _real_dir(path: Path, label: str) -> Path:
  if path.is_symlink():
    raise base.PackageError(f"{label} must not be a symlink")
  try:
    resolved = path.resolve(strict=True)
  except (OSError, RuntimeError) as exc:
    raise base.PackageError(f"{label} is unavailable") from exc
  if not resolved.is_dir():
    raise base.PackageError(f"{label} must be a real directory")
  return resolved


def key_id(public_key: Path) -> str:
  return f"sha256:{base.sha256_file(_real_file(public_key, 'trusted public key'))}"


def _signing(value: Mapping[str, Any], label: str) -> Mapping[str, Any]:
  signing = value.get("signing")
  if not isinstance(signing, Mapping):
    raise base.PackageError(f"{label} signing metadata is required")
  if signing.get("status") != "signed":
    raise base.PackageError(f"{label} signing status must be signed")
  if signing.get("algorithm") != "ed25519":
    raise base.PackageError(f"{label} signing algorithm must be ed25519")
  if not str(signing.get("key_id") or "").strip():
    raise base.PackageError(f"{label} signing key id is required")
  return signing


def _require_key_binding(value: Mapping[str, Any], public_key: Path, label: str) -> str:
  signing = _signing(value, label)
  expected = key_id(public_key)
  if signing.get("key_id") != expected:
    raise base.PackageError(f"{label} signing key id does not match the trusted public key")
  return expected


def canonical_entitlement_bytes(entitlement: Mapping[str, Any]) -> bytes:
  payload = json.loads(json.dumps(dict(entitlement)))
  signing = payload.get("signing")
  signing = dict(signing) if isinstance(signing, Mapping) else {}
  signing.pop("signature_path", None)
  payload["signing"] = signing
  return json.dumps(
    payload,
    ensure_ascii=False,
    sort_keys=True,
    separators=(",", ":"),
  ).encode("utf-8")


def _verify_detached(payload_bytes: bytes, signature: Path, public_key: Path, label: str) -> None:
  signature_file = _real_file(signature, f"{label} signature")
  key_file = _real_file(public_key, f"{label} public key")
  with tempfile.NamedTemporaryFile(prefix=f"local-ai-os-{label}-", delete=False) as handle:
    payload = Path(handle.name)
    handle.write(payload_bytes)
  try:
    base.openssl([
      "pkeyutl",
      "-verify",
      "-pubin",
      "-inkey",
      str(key_file),
      "-sigfile",
      str(signature_file),
      "-rawin",
      "-in",
      str(payload),
    ])
  finally:
    payload.unlink(missing_ok=True)


def entitlement_signature_path(entitlement: Mapping[str, Any], signature_root: Path) -> Path:
  signing = _signing(entitlement, "entitlement")
  relative = base.safe_relative(signing.get("signature_path"))
  root = _real_dir(signature_root, "entitlement signature root")
  source = base.resolved_within(root, root / relative)
  if (root / relative).is_symlink() or not source.is_file():
    raise base.PackageError("entitlement signature path is unsafe")
  return source


def verify_entitlement_signature(
  entitlement: Mapping[str, Any],
  signature_root: Path,
  public_key: Path,
) -> str:
  expected_key_id = _require_key_binding(entitlement, public_key, "entitlement")
  signature = entitlement_signature_path(entitlement, signature_root)
  _verify_detached(
    canonical_entitlement_bytes(entitlement),
    signature,
    public_key,
    "entitlement",
  )
  return expected_key_id


def verify_bundle(
  release: Mapping[str, Any],
  artifacts: Path,
  entitlement: Mapping[str, Any],
  release_public_key: Path,
  entitlement_signature_root: Path,
  entitlement_public_key: Path,
) -> list[dict[str, Any]]:
  _require_key_binding(release, release_public_key, "release")
  verified = base.validate_release(
    release,
    artifacts,
    entitlement,
    public_key=release_public_key,
  )
  base.validate_entitlement(entitlement, release)
  verify_entitlement_signature(
    entitlement,
    entitlement_signature_root,
    entitlement_public_key,
  )
  return verified


def _copy_real_file(source: Path, target: Path, label: str) -> None:
  source_file = _real_file(source, label)
  target.parent.mkdir(parents=True, exist_ok=True)
  if target.exists() or target.is_symlink():
    raise base.PackageError(f"refusing to overwrite installed {label}")
  shutil.copy2(source_file, target)
  os.chmod(target, 0o600)


def persist_trust(
  root: Path,
  release: Mapping[str, Any],
  artifacts: Path,
  entitlement: Mapping[str, Any],
  release_public_key: Path,
  entitlement_signature_root: Path,
  entitlement_public_key: Path,
) -> None:
  version = base.safe_version(release.get("version"))
  release_root = root / "releases" / version
  base.resolved_within(root, release_root)
  trust = release_root / TRUST_DIR
  if trust.exists() or trust.is_symlink():
    raise base.PackageError("installed release trust directory already exists")
  trust.mkdir(mode=0o700)

  release_signing = _signing(release, "release")
  release_signature_relative = base.safe_relative(release_signing.get("signature_path"))
  artifact_root = _real_dir(artifacts, "artifact root")
  release_signature = base.resolved_within(
    artifact_root,
    artifact_root / release_signature_relative,
  )
  if (artifact_root / release_signature_relative).is_symlink():
    raise base.PackageError("release signature path is unsafe")

  entitlement_signing = _signing(entitlement, "entitlement")
  entitlement_signature_relative = base.safe_relative(entitlement_signing.get("signature_path"))
  entitlement_signature = entitlement_signature_path(
    entitlement,
    entitlement_signature_root,
  )

  _copy_real_file(release_signature, trust / "release.sig", "release signature")
  _copy_real_file(release_public_key, trust / "release-public-key.pem", "release public key")
  _copy_real_file(entitlement_signature, trust / "entitlement.sig", "entitlement signature")
  _copy_real_file(
    entitlement_public_key,
    trust / "entitlement-public-key.pem",
    "entitlement public key",
  )
  receipt = {
    "schema_version": TRUST_SCHEMA,
    "product_id": base.PRODUCT_ID,
    "version": version,
    "release_key_id": key_id(release_public_key),
    "entitlement_key_id": key_id(entitlement_public_key),
    "release_signature_path": str(release_signature_relative),
    "entitlement_signature_path": str(entitlement_signature_relative),
  }
  base.write_json(trust / TRUST_RECEIPT, receipt)
  os.chmod(trust / TRUST_RECEIPT, 0o600)


def verify_installed_trust(root: Path, version: str) -> dict[str, Any]:
  version = base.safe_version(version)
  release = base.verify_installed(root, version)
  release_root = root / "releases" / version
  base.resolved_within(root, release_root)

  entitlement_path = release_root / "entitlement.json"
  if entitlement_path.is_symlink() or not entitlement_path.is_file():
    raise base.PackageError("installed entitlement is missing or unsafe")
  entitlement = base.read_json(entitlement_path)
  base.validate_entitlement(entitlement, release)

  trust = release_root / TRUST_DIR
  if trust.is_symlink() or not trust.is_dir():
    raise base.PackageError("installed release trust directory is missing or unsafe")
  base.resolved_within(release_root, trust)
  receipt_path = trust / TRUST_RECEIPT
  if receipt_path.is_symlink() or not receipt_path.is_file():
    raise base.PackageError("installed trust receipt is missing or unsafe")
  receipt = base.read_json(receipt_path)
  if receipt.get("schema_version") != TRUST_SCHEMA:
    raise base.PackageError("installed trust receipt schema mismatch")
  if receipt.get("product_id") != base.PRODUCT_ID or receipt.get("version") != version:
    raise base.PackageError("installed trust receipt identity mismatch")

  release_key = trust / "release-public-key.pem"
  entitlement_key = trust / "entitlement-public-key.pem"
  release_signature = trust / "release.sig"
  entitlement_signature = trust / "entitlement.sig"
  release_key_id = key_id(release_key)
  entitlement_key_id = key_id(entitlement_key)
  if receipt.get("release_key_id") != release_key_id:
    raise base.PackageError("installed release public key fingerprint changed")
  if receipt.get("entitlement_key_id") != entitlement_key_id:
    raise base.PackageError("installed entitlement public key fingerprint changed")

  release_signing = _signing(release, "release")
  entitlement_signing = _signing(entitlement, "entitlement")
  if release_signing.get("key_id") != release_key_id:
    raise base.PackageError("installed release key binding mismatch")
  if entitlement_signing.get("key_id") != entitlement_key_id:
    raise base.PackageError("installed entitlement key binding mismatch")
  if receipt.get("release_signature_path") != str(base.safe_relative(release_signing.get("signature_path"))):
    raise base.PackageError("installed release signature identity changed")
  if receipt.get("entitlement_signature_path") != str(base.safe_relative(entitlement_signing.get("signature_path"))):
    raise base.PackageError("installed entitlement signature identity changed")

  _verify_detached(
    base.canonical_release_bytes(release),
    release_signature,
    release_key,
    "installed-release",
  )
  _verify_detached(
    canonical_entitlement_bytes(entitlement),
    entitlement_signature,
    entitlement_key,
    "installed-entitlement",
  )
  return {
    "release": release,
    "entitlement": entitlement,
    "release_key_id": release_key_id,
    "entitlement_key_id": entitlement_key_id,
  }


def install(
  root: Path,
  artifacts: Path,
  manifest_path: Path,
  entitlement_path: Path,
  release_public_key: Path,
  entitlement_signature_root: Path,
  entitlement_public_key: Path,
) -> dict[str, Any]:
  release = base.read_json(manifest_path)
  entitlement = base.read_json(entitlement_path)
  verify_bundle(
    release,
    artifacts,
    entitlement,
    release_public_key,
    entitlement_signature_root,
    entitlement_public_key,
  )
  base.install(
    root,
    artifacts,
    manifest_path,
    entitlement_path,
    public_key=release_public_key,
  )
  persist_trust(
    root,
    release,
    artifacts,
    entitlement,
    release_public_key,
    entitlement_signature_root,
    entitlement_public_key,
  )
  return doctor(root)


def doctor(root: Path) -> dict[str, Any]:
  base.require_managed_root(root)
  current = base.current_state(root)
  if current.get("product_id") != base.PRODUCT_ID:
    raise base.PackageError("current release product mismatch")
  version = base.safe_version(current.get("version"))
  verified = verify_installed_trust(root, version)
  release = verified["release"]
  entitlement = verified["entitlement"]
  return {
    "status": "pass",
    "product_id": base.PRODUCT_ID,
    "version": version,
    "source_sha": release.get("source_sha"),
    "package_integrity": "verified_against_signed_release",
    "entitlement_integrity": "signed_active_and_release_bound",
    "entitlement_id": str(entitlement.get("entitlement_id") or ""),
    "release_key_id": verified["release_key_id"],
    "entitlement_key_id": verified["entitlement_key_id"],
    "runtime_and_live": "unknown",
  }


def acceptance(root: Path) -> dict[str, Any]:
  result = doctor(root)
  result["acceptance"] = "signed_customer_package_mechanics_verified"
  result["production_acceptance"] = "unknown"
  return result


def rollback(root: Path, version: str) -> dict[str, Any]:
  base.require_managed_root(root)
  version = base.safe_version(version)
  verify_installed_trust(root, version)
  base.rollback(root, version)
  return doctor(root)


def _write_payload(path: Path, payload: bytes) -> None:
  path.write_bytes(payload)


def _sign(private_key: Path, payload: bytes, output: Path) -> None:
  with tempfile.NamedTemporaryFile(prefix="local-ai-os-sign-", delete=False) as handle:
    payload_path = Path(handle.name)
    handle.write(payload)
  try:
    base.openssl([
      "pkeyutl",
      "-sign",
      "-inkey",
      str(_real_file(private_key, "test private key")),
      "-rawin",
      "-in",
      str(payload_path),
      "-out",
      str(output),
    ])
  finally:
    payload_path.unlink(missing_ok=True)


def _generate_keypair(work: Path, stem: str) -> tuple[Path, Path]:
  private_key = work / f"{stem}-private.pem"
  public_key = work / f"{stem}-public.pem"
  base.openssl(["genpkey", "-algorithm", "ED25519", "-out", str(private_key)])
  base.openssl(["pkey", "-in", str(private_key), "-pubout", "-out", str(public_key)])
  return private_key, public_key


def signed_fixture(
  work: Path,
  version: str,
  source_char: str,
  release_private_key: Path,
  release_public_key: Path,
  entitlement_private_key: Path,
  entitlement_public_key: Path,
) -> tuple[Path, Path, Path, Path]:
  artifacts, manifest_path, entitlement_path = base.synthetic_release(work, version, source_char)

  release = base.read_json(manifest_path)
  release["signing"] = {
    "algorithm": "ed25519",
    "key_id": key_id(release_public_key),
    "status": "signed",
    "signature_path": "release.sig",
  }
  base.write_json(manifest_path, release)
  _sign(
    release_private_key,
    base.canonical_release_bytes(release),
    artifacts / "release.sig",
  )

  signature_root = work / f"entitlement-signatures-{version}"
  signature_root.mkdir()
  entitlement = base.read_json(entitlement_path)
  entitlement["signing"] = {
    "algorithm": "ed25519",
    "key_id": key_id(entitlement_public_key),
    "status": "signed",
    "signature_path": "entitlement.sig",
  }
  base.write_json(entitlement_path, entitlement)
  _sign(
    entitlement_private_key,
    canonical_entitlement_bytes(entitlement),
    signature_root / "entitlement.sig",
  )
  return artifacts, manifest_path, entitlement_path, signature_root


def selftest() -> dict[str, Any]:
  with tempfile.TemporaryDirectory() as temp:
    work = Path(temp)
    root = work / "clean-target"
    release_private_key, release_public_key = _generate_keypair(work, "release")
    entitlement_private_key, entitlement_public_key = _generate_keypair(work, "entitlement")
    first = signed_fixture(
      work,
      "0.0.1-secure-test",
      "a",
      release_private_key,
      release_public_key,
      entitlement_private_key,
      entitlement_public_key,
    )
    second = signed_fixture(
      work,
      "0.0.2-secure-test",
      "b",
      release_private_key,
      release_public_key,
      entitlement_private_key,
      entitlement_public_key,
    )

    verify_bundle(
      base.read_json(first[1]),
      first[0],
      base.read_json(first[2]),
      release_public_key,
      first[3],
      entitlement_public_key,
    )

    unsigned = base.synthetic_release(work, "0.0.3-unsigned-test", "c")
    synthetic_release_rejected = base.expect_blocked(lambda: verify_bundle(
      base.read_json(unsigned[1]),
      unsigned[0],
      base.read_json(unsigned[2]),
      release_public_key,
      work,
      entitlement_public_key,
    ))

    forged_entitlement = base.read_json(first[2])
    forged_entitlement["entitlement_id"] = "forged-but-structurally-valid"
    forged_path = work / "forged-entitlement.json"
    base.write_json(forged_path, forged_entitlement)
    forged_entitlement_rejected = base.expect_blocked(lambda: verify_bundle(
      base.read_json(first[1]),
      first[0],
      base.read_json(forged_path),
      release_public_key,
      first[3],
      entitlement_public_key,
    ))

    first_result = install(
      root,
      first[0],
      first[1],
      first[2],
      release_public_key,
      first[3],
      entitlement_public_key,
    )
    second_result = install(
      root,
      second[0],
      second[1],
      second[2],
      release_public_key,
      second[3],
      entitlement_public_key,
    )
    rollback_result = rollback(root, "0.0.1-secure-test")
    acceptance_result = acceptance(root)

    installed_entitlement = root / "releases" / "0.0.1-secure-test" / "entitlement.json"
    original_entitlement = base.read_json(installed_entitlement)
    tampered_entitlement = dict(original_entitlement)
    tampered_entitlement["entitlement_id"] = "tampered-after-install"
    base.write_json(installed_entitlement, tampered_entitlement)
    installed_entitlement_tamper_rejected = base.expect_blocked(lambda: doctor(root))
    base.write_json(installed_entitlement, original_entitlement)
    doctor(root)

    uninstall_result = base.uninstall(root)
    if root.exists():
      raise base.PackageError("secure synthetic uninstall left managed root behind")
    return {
      "status": "pass",
      "install": [first_result["version"], second_result["version"]],
      "rollback": rollback_result["version"],
      "acceptance": acceptance_result["acceptance"],
      "synthetic_release_rejected": synthetic_release_rejected,
      "forged_entitlement_rejected": forged_entitlement_rejected,
      "installed_entitlement_tamper_rejected": installed_entitlement_tamper_rejected,
      "release_key_binding": first_result["release_key_id"],
      "entitlement_key_binding": first_result["entitlement_key_id"],
      "production_acceptance": "unknown",
      "runtime_and_live": "unknown",
      "uninstall": uninstall_result["status"],
    }


def print_json(value: Mapping[str, Any]) -> None:
  print(json.dumps(dict(value), ensure_ascii=False, indent=2, sort_keys=True))


def add_verification_args(parser: argparse.ArgumentParser) -> None:
  parser.add_argument("--artifacts", type=Path, required=True)
  parser.add_argument("--manifest", type=Path, required=True)
  parser.add_argument("--entitlement", type=Path, required=True)
  parser.add_argument("--release-public-key", type=Path, required=True)
  parser.add_argument("--entitlement-signatures", type=Path, required=True)
  parser.add_argument("--entitlement-public-key", type=Path, required=True)


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  sub = parser.add_subparsers(dest="command", required=True)

  compatibility_parser = sub.add_parser("compatibility")
  compatibility_parser.add_argument("--facts", type=Path, required=True)

  verify_parser = sub.add_parser("verify")
  add_verification_args(verify_parser)

  install_parser = sub.add_parser("install")
  install_parser.add_argument("--root", type=Path, required=True)
  add_verification_args(install_parser)

  doctor_parser = sub.add_parser("doctor")
  doctor_parser.add_argument("--root", type=Path, required=True)
  acceptance_parser = sub.add_parser("acceptance")
  acceptance_parser.add_argument("--root", type=Path, required=True)
  rollback_parser = sub.add_parser("rollback")
  rollback_parser.add_argument("--root", type=Path, required=True)
  rollback_parser.add_argument("--to", required=True)
  uninstall_parser = sub.add_parser("uninstall")
  uninstall_parser.add_argument("--root", type=Path, required=True)
  sub.add_parser("selftest")
  args = parser.parse_args()

  if args.command == "compatibility":
    print_json(base.compatibility(base.read_json(args.facts)))
  elif args.command == "verify":
    rows = verify_bundle(
      base.read_json(args.manifest),
      args.artifacts,
      base.read_json(args.entitlement),
      args.release_public_key,
      args.entitlement_signatures,
      args.entitlement_public_key,
    )
    print_json({
      "status": "pass",
      "artifacts_verified": len(rows),
      "release_signature": "verified",
      "entitlement_signature": "verified",
      "runtime_and_live": "unknown",
    })
  elif args.command == "install":
    print_json(install(
      args.root,
      args.artifacts,
      args.manifest,
      args.entitlement,
      args.release_public_key,
      args.entitlement_signatures,
      args.entitlement_public_key,
    ))
  elif args.command == "doctor":
    print_json(doctor(args.root))
  elif args.command == "acceptance":
    print_json(acceptance(args.root))
  elif args.command == "rollback":
    print_json(rollback(args.root, args.to))
  elif args.command == "uninstall":
    print_json(base.uninstall(args.root))
  else:
    print_json(selftest())
  return 0


if __name__ == "__main__":
  try:
    raise SystemExit(main())
  except base.PackageError as exc:
    print(f"customer_package_secure=BLOCKED reason={exc}")
    raise SystemExit(2)
