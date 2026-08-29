#!/usr/bin/env python3
"""Fail-closed source harness for the LOCAL AI OS customer package lifecycle."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Any, Mapping


PRODUCT_ID = "local-ai-os"
MARKER = ".local-ai-os-managed-root"
CURRENT = "current.json"
MANAGED_SCHEMA = "2026-08-30.local-ai-os-managed-root.v1"
RELEASE_SCHEMA = "2026-08-30.local-ai-os-release.v1"
ENTITLEMENT_SCHEMA = "2026-08-30.local-ai-os-entitlement.v1"
FACTS_SCHEMA = "2026-08-30.local-ai-os-compatibility.v1"
VERSION_RE = re.compile(r"^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$")


class PackageError(RuntimeError):
  pass


def read_json(path: Path) -> dict[str, Any]:
  try:
    value = json.loads(path.read_text(encoding="utf-8"))
  except (OSError, UnicodeError, json.JSONDecodeError) as exc:
    raise PackageError(f"cannot read JSON: {path}") from exc
  if not isinstance(value, dict):
    raise PackageError(f"JSON root must be an object: {path}")
  return value


def write_json(path: Path, value: Mapping[str, Any]) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  temp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
  temp.write_text(
    json.dumps(dict(value), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
  )
  os.replace(temp, path)


def sha256_file(path: Path) -> str:
  digest = hashlib.sha256()
  with path.open("rb") as handle:
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
      digest.update(chunk)
  return digest.hexdigest()


def is_hex(value: Any, length: int) -> bool:
  raw = str(value or "")
  return len(raw) == length and all(char in "0123456789abcdef" for char in raw)


def safe_relative(value: Any) -> Path:
  raw = str(value or "").strip()
  path = Path(raw)
  if not raw or path.is_absolute() or ".." in path.parts:
    raise PackageError(f"unsafe package path: {raw or '<empty>'}")
  return path


def safe_version(value: Any) -> str:
  version = str(value or "").strip()
  if not VERSION_RE.fullmatch(version):
    raise PackageError("release version contains unsafe characters")
  return version


def resolved_within(root: Path, candidate: Path) -> Path:
  try:
    resolved_root = root.resolve(strict=True)
    resolved = candidate.resolve(strict=True)
    resolved.relative_to(resolved_root)
  except (OSError, RuntimeError, ValueError) as exc:
    raise PackageError(f"path escapes managed boundary: {candidate}") from exc
  return resolved


def compatibility(facts: Mapping[str, Any]) -> dict[str, Any]:
  if facts.get("schema_version") != FACTS_SCHEMA:
    raise PackageError("unsupported compatibility facts schema")
  blockers = []
  actions = []
  if facts.get("os") != "linux":
    blockers.append("unsupported_os")
  if facts.get("arch") not in {"x86_64", "aarch64"}:
    blockers.append("unsupported_arch")
  if facts.get("target_writable") is not True:
    actions.append("choose_writable_install_target")
  free_mb = facts.get("disk_free_mb")
  if not isinstance(free_mb, int) or free_mb < 1024:
    actions.append("free_at_least_1024_mb")
  result = "unsupported" if blockers else ("needs_action" if actions else "supported")
  return {
    "result": result,
    "blockers": blockers,
    "actions": actions,
    "runtime_and_live": "unknown",
  }


def canonical_release_bytes(release: Mapping[str, Any]) -> bytes:
  payload = json.loads(json.dumps(dict(release)))
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


def openssl(argv: list[str]) -> None:
  try:
    result = subprocess.run(
      ["openssl", *argv],
      capture_output=True,
      text=True,
      check=False,
    )
  except FileNotFoundError as exc:
    raise PackageError("openssl is required for Ed25519 release verification") from exc
  if result.returncode != 0:
    raise PackageError("openssl operation failed")


def verify_signature(
  release: Mapping[str, Any],
  artifact_root: Path,
  public_key: Path,
) -> None:
  signing = release.get("signing")
  signing = signing if isinstance(signing, Mapping) else {}
  if signing.get("status") != "signed":
    raise PackageError("production release signing status must be signed")
  if signing.get("algorithm") != "ed25519":
    raise PackageError("production release signing algorithm must be ed25519")
  if not str(signing.get("key_id") or "").strip():
    raise PackageError("signing key id is required")
  signature_relative = safe_relative(signing.get("signature_path"))
  signature = resolved_within(artifact_root, artifact_root / signature_relative)
  try:
    key = public_key.resolve(strict=True)
  except (OSError, RuntimeError) as exc:
    raise PackageError("trusted release public key is unavailable") from exc
  if not signature.is_file() or (artifact_root / signature_relative).is_symlink():
    raise PackageError("release signature path is unsafe")
  if not key.is_file() or public_key.is_symlink():
    raise PackageError("release public key path is unsafe")
  with tempfile.NamedTemporaryFile(prefix="local-ai-os-release-", delete=False) as handle:
    payload = Path(handle.name)
    handle.write(canonical_release_bytes(release))
  try:
    openssl([
      "pkeyutl",
      "-verify",
      "-pubin",
      "-inkey",
      str(key),
      "-sigfile",
      str(signature),
      "-rawin",
      "-in",
      str(payload),
    ])
  finally:
    payload.unlink(missing_ok=True)


def validate_entitlement(
  entitlement: Mapping[str, Any],
  release: Mapping[str, Any],
) -> None:
  if entitlement.get("schema_version") != ENTITLEMENT_SCHEMA:
    raise PackageError("unsupported entitlement schema")
  if entitlement.get("product_id") != PRODUCT_ID:
    raise PackageError("entitlement product mismatch")
  if entitlement.get("status") != "active":
    raise PackageError("entitlement is not active")
  if not str(entitlement.get("entitlement_id") or "").strip():
    raise PackageError("entitlement id is required")
  if not str(entitlement.get("sku") or "").strip():
    raise PackageError("entitlement sku is required")
  if entitlement.get("release_version") != release.get("version"):
    raise PackageError("entitlement release version mismatch")


def validate_release(
  release: Mapping[str, Any],
  artifact_root: Path,
  entitlement: Mapping[str, Any],
  *,
  allow_synthetic_signature: bool = False,
  public_key: Path | None = None,
) -> list[dict[str, Any]]:
  if release.get("schema_version") != RELEASE_SCHEMA:
    raise PackageError("unsupported release manifest schema")
  if release.get("product_id") != PRODUCT_ID:
    raise PackageError("release product mismatch")
  safe_version(release.get("version"))
  if not is_hex(release.get("source_sha"), 40):
    raise PackageError("release source_sha must be a full lowercase git SHA")
  validate_entitlement(entitlement, release)

  try:
    artifact_base = artifact_root.resolve(strict=True)
  except (OSError, RuntimeError) as exc:
    raise PackageError("artifact root is unavailable") from exc
  if artifact_root.is_symlink() or not artifact_base.is_dir():
    raise PackageError("artifact root must be a real directory")

  signing = release.get("signing")
  signing = signing if isinstance(signing, Mapping) else {}
  if signing.get("status") == "synthetic_test_only":
    if not allow_synthetic_signature:
      raise PackageError("synthetic signature evidence is forbidden outside test mode")
  else:
    if public_key is None:
      raise PackageError("production release requires a trusted Ed25519 public key")
    verify_signature(release, artifact_root, public_key)

  rows = release.get("artifacts")
  if not isinstance(rows, list) or not rows:
    raise PackageError("release artifacts must be a non-empty list")
  verified = []
  kinds = set()
  for raw in rows:
    if not isinstance(raw, Mapping):
      raise PackageError("artifact row must be an object")
    relative = safe_relative(raw.get("path"))
    expected_digest = str(raw.get("sha256") or "")
    expected_size = raw.get("size")
    if not is_hex(expected_digest, 64):
      raise PackageError(f"invalid artifact digest: {relative}")
    if not isinstance(expected_size, int) or expected_size < 0:
      raise PackageError(f"invalid artifact size: {relative}")
    source = resolved_within(artifact_root, artifact_root / relative)
    if not source.is_file() or (artifact_root / relative).is_symlink():
      raise PackageError(f"artifact missing or unsafe: {relative}")
    if source.stat().st_size != expected_size:
      raise PackageError(f"artifact size mismatch: {relative}")
    actual_digest = sha256_file(source)
    if actual_digest != expected_digest:
      raise PackageError(f"artifact digest mismatch: {relative}")
    kind = str(raw.get("kind") or "payload")
    kinds.add(kind)
    verified.append({
      "path": str(relative),
      "kind": kind,
      "size": expected_size,
      "sha256": actual_digest,
    })
  if "sbom" not in kinds:
    raise PackageError("release must include an SBOM/equivalent inventory artifact")
  if "provenance" not in kinds:
    raise PackageError("release must include a provenance artifact")
  return verified


def require_managed_root(root: Path) -> None:
  if root.is_symlink():
    raise PackageError("managed root must not be a symlink")
  marker = root / MARKER
  if not marker.is_file() or marker.is_symlink():
    raise PackageError("target is not a LOCAL AI OS managed root")
  value = read_json(marker)
  if value.get("schema_version") != MANAGED_SCHEMA or value.get("product_id") != PRODUCT_ID:
    raise PackageError("managed root marker is invalid")


def current_state(root: Path) -> dict[str, Any]:
  path = root / CURRENT
  if path.is_symlink():
    raise PackageError("current release pointer must not be a symlink")
  return read_json(path)


def verify_installed(root: Path, version: str) -> dict[str, Any]:
  version = safe_version(version)
  release_root = root / "releases" / version
  if release_root.is_symlink():
    raise PackageError("installed release directory must not be a symlink")
  resolved_within(root, release_root)
  manifest_path = release_root / "release-manifest.json"
  if not manifest_path.is_file() or manifest_path.is_symlink():
    raise PackageError("installed release manifest is missing or unsafe")
  manifest = read_json(manifest_path)
  if manifest.get("product_id") != PRODUCT_ID or safe_version(manifest.get("version")) != version:
    raise PackageError("installed release identity mismatch")
  rows = manifest.get("artifacts")
  if not isinstance(rows, list) or not rows:
    raise PackageError("installed release inventory is missing")
  artifact_root = release_root / "artifacts"
  for raw in rows:
    if not isinstance(raw, Mapping):
      raise PackageError("installed artifact row is invalid")
    relative = safe_relative(raw.get("path"))
    target = resolved_within(artifact_root, artifact_root / relative)
    if not target.is_file() or (artifact_root / relative).is_symlink():
      raise PackageError(f"installed artifact missing or unsafe: {relative}")
    if target.stat().st_size != raw.get("size") or sha256_file(target) != raw.get("sha256"):
      raise PackageError(f"installed artifact integrity mismatch: {relative}")
  return manifest


def install(
  root: Path,
  artifact_root: Path,
  manifest_path: Path,
  entitlement_path: Path,
  *,
  allow_synthetic_signature: bool = False,
  public_key: Path | None = None,
) -> dict[str, Any]:
  release = read_json(manifest_path)
  entitlement = read_json(entitlement_path)
  verified = validate_release(
    release,
    artifact_root,
    entitlement,
    allow_synthetic_signature=allow_synthetic_signature,
    public_key=public_key,
  )
  version = safe_version(release["version"])

  if root.is_symlink():
    raise PackageError("managed root must not be a symlink")
  if root.exists():
    if not root.is_dir():
      raise PackageError("managed root must be a directory")
    if (root / MARKER).exists():
      require_managed_root(root)
    elif any(root.iterdir()):
      raise PackageError("refusing to adopt a non-empty unmanaged directory")
    else:
      write_json(root / MARKER, {
        "schema_version": MANAGED_SCHEMA,
        "product_id": PRODUCT_ID,
      })
  else:
    root.mkdir(parents=True)
    write_json(root / MARKER, {
      "schema_version": MANAGED_SCHEMA,
      "product_id": PRODUCT_ID,
    })

  release_root = root / "releases" / version
  if release_root.exists() or release_root.is_symlink():
    raise PackageError(f"release already installed or unsafe: {version}")
  staging = root / "releases" / f".{version}.{os.getpid()}.staging"
  if staging.exists() or staging.is_symlink():
    raise PackageError("staging path already exists")
  target_root = staging / "artifacts"
  target_root.mkdir(parents=True)
  for row in verified:
    relative = Path(row["path"])
    target = target_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(resolved_within(artifact_root, artifact_root / relative), target)
  write_json(staging / "release-manifest.json", release)
  write_json(staging / "entitlement.json", entitlement)
  staging.rename(release_root)

  previous = ""
  if (root / CURRENT).is_file():
    previous = safe_version(current_state(root).get("version"))
  write_json(root / CURRENT, {
    "product_id": PRODUCT_ID,
    "version": version,
    "previous_version": previous,
  })
  return doctor(root)


def doctor(root: Path) -> dict[str, Any]:
  require_managed_root(root)
  current = current_state(root)
  if current.get("product_id") != PRODUCT_ID:
    raise PackageError("current release product mismatch")
  version = safe_version(current.get("version"))
  manifest = verify_installed(root, version)
  return {
    "status": "pass",
    "product_id": PRODUCT_ID,
    "version": version,
    "source_sha": manifest.get("source_sha"),
    "package_integrity": "verified",
    "runtime_and_live": "unknown",
  }


def acceptance(root: Path) -> dict[str, Any]:
  result = doctor(root)
  result["acceptance"] = "source_package_mechanics_verified"
  result["production_acceptance"] = "unknown"
  return result


def rollback(root: Path, version: str) -> dict[str, Any]:
  require_managed_root(root)
  version = safe_version(version)
  current_version = safe_version(current_state(root).get("version"))
  verify_installed(root, version)
  write_json(root / CURRENT, {
    "product_id": PRODUCT_ID,
    "version": version,
    "previous_version": current_version,
  })
  return doctor(root)


def uninstall(root: Path) -> dict[str, Any]:
  require_managed_root(root)
  resolved = root.resolve(strict=True)
  if resolved == Path(resolved.anchor):
    raise PackageError("refusing to remove filesystem root")
  shutil.rmtree(resolved)
  return {
    "status": "pass",
    "removed": str(resolved),
    "runtime_and_live": "unknown",
  }


def synthetic_release(
  work: Path,
  version: str,
  source_char: str,
) -> tuple[Path, Path, Path]:
  artifacts = work / f"artifacts-{version}"
  artifacts.mkdir()
  files = [
    ("payload.txt", "payload", f"LOCAL AI OS synthetic payload {version}\n"),
    ("sbom.json", "sbom", json.dumps({"synthetic": True, "version": version}) + "\n"),
    ("provenance.json", "provenance", json.dumps({"source_sha": source_char * 40}) + "\n"),
  ]
  rows = []
  for name, kind, content in files:
    path = artifacts / name
    path.write_text(content, encoding="utf-8")
    rows.append({
      "path": name,
      "kind": kind,
      "sha256": sha256_file(path),
      "size": path.stat().st_size,
    })
  manifest = work / f"release-{version}.json"
  write_json(manifest, {
    "schema_version": RELEASE_SCHEMA,
    "product_id": PRODUCT_ID,
    "version": version,
    "source_sha": source_char * 40,
    "artifacts": rows,
    "signing": {
      "algorithm": "synthetic-none",
      "key_id": "test-only",
      "status": "synthetic_test_only",
    },
  })
  entitlement = work / f"entitlement-{version}.json"
  write_json(entitlement, {
    "schema_version": ENTITLEMENT_SCHEMA,
    "product_id": PRODUCT_ID,
    "entitlement_id": f"synthetic-{version}",
    "sku": "synthetic-local-ai-os",
    "release_version": version,
    "status": "active",
  })
  return artifacts, manifest, entitlement


def expect_blocked(callable_value) -> bool:
  try:
    callable_value()
  except PackageError:
    return True
  raise PackageError("expected fail-closed operation unexpectedly succeeded")


def selftest() -> dict[str, Any]:
  with tempfile.TemporaryDirectory() as temp:
    work = Path(temp)
    root = work / "clean-target"
    first = synthetic_release(work, "0.0.1-test", "a")
    second = synthetic_release(work, "0.0.2-test", "b")

    synthetic_rejected = expect_blocked(
      lambda: validate_release(read_json(first[1]), first[0], read_json(first[2]))
    )
    unmanaged = work / "unmanaged"
    unmanaged.mkdir()
    unmanaged_delete_rejected = expect_blocked(lambda: uninstall(unmanaged))
    nonempty = work / "nonempty"
    nonempty.mkdir()
    (nonempty / "keep.txt").write_text("keep\n", encoding="utf-8")
    nonempty_adoption_rejected = expect_blocked(
      lambda: install(nonempty, *first, allow_synthetic_signature=True)
    )
    malicious = read_json(first[1])
    malicious["version"] = "../escape"
    unsafe_version_rejected = expect_blocked(
      lambda: validate_release(
        malicious,
        first[0],
        read_json(first[2]),
        allow_synthetic_signature=True,
      )
    )

    signed_artifacts, signed_manifest_path, signed_entitlement_path = synthetic_release(
      work,
      "0.0.3-signed-test",
      "c",
    )
    private_key = work / "test-private.pem"
    public_key = work / "test-public.pem"
    openssl(["genpkey", "-algorithm", "ED25519", "-out", str(private_key)])
    openssl(["pkey", "-in", str(private_key), "-pubout", "-out", str(public_key)])
    signed_manifest = read_json(signed_manifest_path)
    signed_manifest["signing"] = {
      "algorithm": "ed25519",
      "key_id": "synthetic-ephemeral",
      "status": "signed",
      "signature_path": "release.sig",
    }
    write_json(signed_manifest_path, signed_manifest)
    payload = work / "signed-payload.json"
    payload.write_bytes(canonical_release_bytes(signed_manifest))
    openssl([
      "pkeyutl",
      "-sign",
      "-inkey",
      str(private_key),
      "-rawin",
      "-in",
      str(payload),
      "-out",
      str(signed_artifacts / "release.sig"),
    ])
    validate_release(
      signed_manifest,
      signed_artifacts,
      read_json(signed_entitlement_path),
      public_key=public_key,
    )
    tampered = dict(signed_manifest)
    tampered["source_sha"] = "d" * 40
    tampered_signature_rejected = expect_blocked(
      lambda: validate_release(
        tampered,
        signed_artifacts,
        read_json(signed_entitlement_path),
        public_key=public_key,
      )
    )

    first_result = install(root, *first, allow_synthetic_signature=True)
    second_result = install(root, *second, allow_synthetic_signature=True)
    rollback_result = rollback(root, "0.0.1-test")
    acceptance_result = acceptance(root)
    uninstall_result = uninstall(root)
    if root.exists():
      raise PackageError("synthetic uninstall left managed root behind")
    return {
      "status": "pass",
      "install": [first_result["version"], second_result["version"]],
      "rollback": rollback_result["version"],
      "acceptance": acceptance_result["acceptance"],
      "uninstall": uninstall_result["status"],
      "synthetic_rejected_without_flag": synthetic_rejected,
      "unmanaged_delete_rejected": unmanaged_delete_rejected,
      "nonempty_adoption_rejected": nonempty_adoption_rejected,
      "unsafe_version_rejected": unsafe_version_rejected,
      "ed25519_signature_verified": True,
      "tampered_signature_rejected": tampered_signature_rejected,
      "production_acceptance": "unknown",
    }


def print_json(value: Mapping[str, Any]) -> None:
  print(json.dumps(dict(value), ensure_ascii=False, indent=2, sort_keys=True))


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  sub = parser.add_subparsers(dest="command", required=True)

  compatibility_parser = sub.add_parser("compatibility")
  compatibility_parser.add_argument("--facts", type=Path, required=True)

  verify_parser = sub.add_parser("verify")
  verify_parser.add_argument("--artifacts", type=Path, required=True)
  verify_parser.add_argument("--manifest", type=Path, required=True)
  verify_parser.add_argument("--entitlement", type=Path, required=True)
  verify_parser.add_argument("--public-key", type=Path)
  verify_parser.add_argument("--allow-synthetic-signature", action="store_true")

  install_parser = sub.add_parser("install")
  install_parser.add_argument("--root", type=Path, required=True)
  install_parser.add_argument("--artifacts", type=Path, required=True)
  install_parser.add_argument("--manifest", type=Path, required=True)
  install_parser.add_argument("--entitlement", type=Path, required=True)
  install_parser.add_argument("--public-key", type=Path)
  install_parser.add_argument("--allow-synthetic-signature", action="store_true")

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
    print_json(compatibility(read_json(args.facts)))
  elif args.command == "verify":
    rows = validate_release(
      read_json(args.manifest),
      args.artifacts,
      read_json(args.entitlement),
      allow_synthetic_signature=args.allow_synthetic_signature,
      public_key=args.public_key,
    )
    print_json({"status": "pass", "artifacts_verified": len(rows), "runtime_and_live": "unknown"})
  elif args.command == "install":
    print_json(install(
      args.root,
      args.artifacts,
      args.manifest,
      args.entitlement,
      allow_synthetic_signature=args.allow_synthetic_signature,
      public_key=args.public_key,
    ))
  elif args.command == "doctor":
    print_json(doctor(args.root))
  elif args.command == "acceptance":
    print_json(acceptance(args.root))
  elif args.command == "rollback":
    print_json(rollback(args.root, args.to))
  elif args.command == "uninstall":
    print_json(uninstall(args.root))
  else:
    print_json(selftest())
  return 0


if __name__ == "__main__":
  try:
    raise SystemExit(main())
  except PackageError as exc:
    print(f"customer_package=BLOCKED reason={exc}", file=sys.stderr)
    raise SystemExit(2)
