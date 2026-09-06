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
ANCHOR_DIR = ".trust-anchors"
ANCHOR_RECEIPT = "anchors.json"
ANCHOR_SCHEMA = "2026-08-30.local-ai-os-trust-anchors.v1"


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


def read_trust_anchors(root: Path) -> dict[str, Any]:
  base.require_managed_root(root)
  anchor_root = root / ANCHOR_DIR
  if anchor_root.is_symlink() or not anchor_root.is_dir():
    raise base.PackageError("managed root trust anchors are missing or unsafe")
  base.resolved_within(root, anchor_root)
  receipt_path = anchor_root / ANCHOR_RECEIPT
  if receipt_path.is_symlink() or not receipt_path.is_file():
    raise base.PackageError("managed root trust anchor receipt is missing or unsafe")
  receipt = base.read_json(receipt_path)
  if receipt.get("schema_version") != ANCHOR_SCHEMA:
    raise base.PackageError("managed root trust anchor schema mismatch")
  if receipt.get("product_id") != base.PRODUCT_ID:
    raise base.PackageError("managed root trust anchor product mismatch")
  release_key = anchor_root / "release-public-key.pem"
  entitlement_key = anchor_root / "entitlement-public-key.pem"
  release_key_id = key_id(release_key)
  entitlement_key_id = key_id(entitlement_key)
  if receipt.get("release_key_id") != release_key_id:
    raise base.PackageError("managed root release trust anchor fingerprint changed")
  if receipt.get("entitlement_key_id") != entitlement_key_id:
    raise base.PackageError("managed root entitlement trust anchor fingerprint changed")
  return {
    "release_key": release_key,
    "entitlement_key": entitlement_key,
    "release_key_id": release_key_id,
    "entitlement_key_id": entitlement_key_id,
  }


def ensure_trust_anchors(
  root: Path,
  release_public_key: Path,
  entitlement_public_key: Path,
  *,
  allow_create: bool,
) -> dict[str, Any]:
  supplied_release_key_id = key_id(release_public_key)
  supplied_entitlement_key_id = key_id(entitlement_public_key)
  anchor_root = root / ANCHOR_DIR
  if anchor_root.exists() or anchor_root.is_symlink():
    anchors = read_trust_anchors(root)
    if anchors["release_key_id"] != supplied_release_key_id:
      raise base.PackageError("release trust anchor rotation requires an explicit migration")
    if anchors["entitlement_key_id"] != supplied_entitlement_key_id:
      raise base.PackageError("entitlement trust anchor rotation requires an explicit migration")
    return anchors
  if not allow_create:
    raise base.PackageError("managed root trust anchors are missing; explicit migration is required")

  anchor_root.mkdir(mode=0o700)
  try:
    _copy_real_file(
      release_public_key,
      anchor_root / "release-public-key.pem",
      "release trust anchor",
    )
    _copy_real_file(
      entitlement_public_key,
      anchor_root / "entitlement-public-key.pem",
      "entitlement trust anchor",
    )
    base.write_json(anchor_root / ANCHOR_RECEIPT, {
      "schema_version": ANCHOR_SCHEMA,
      "product_id": base.PRODUCT_ID,
      "release_key_id": supplied_release_key_id,
      "entitlement_key_id": supplied_entitlement_key_id,
      "rotation": "explicit_migration_only",
    })
    os.chmod(anchor_root / ANCHOR_RECEIPT, 0o600)
    return read_trust_anchors(root)
  except Exception:
    if anchor_root.exists() and not anchor_root.is_symlink():
      shutil.rmtree(anchor_root)
    raise


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

  anchors = read_trust_anchors(root)
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
  if anchors["release_key_id"] != release_key_id:
    raise base.PackageError("installed release key does not match managed root trust anchor")
  if anchors["entitlement_key_id"] != entitlement_key_id:
    raise base.PackageError("installed entitlement key does not match managed root trust anchor")

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
    anchors["release_key"],
    "installed-release",
  )
  _verify_detached(
    canonical_entitlement_bytes(entitlement),
    entitlement_signature,
    anchors["entitlement_key"],
    "installed-entitlement",
  )
  return {
    "release": release,
    "entitlement": entitlement,
    "release_key_id": release_key_id,
    "entitlement_key_id": entitlement_key_id,
  }


def _current_before_install(root: Path) -> dict[str, Any] | None:
  if not root.exists() or root.is_symlink():
    return None
  marker = root / base.MARKER
  if not marker.exists():
    return None
  base.require_managed_root(root)
  current_path = root / base.CURRENT
  if current_path.is_symlink():
    raise base.PackageError("current release pointer must not be a symlink")
  if not current_path.exists():
    return None
  return base.current_state(root)


def _install_root_state(root: Path) -> dict[str, Any]:
  if root.is_symlink():
    raise base.PackageError("managed root must not be a symlink")
  if not root.exists():
    return {
      "preexisting": False,
      "empty_unmanaged": False,
      "previous_current": None,
      "anchors_preexisting": False,
    }
  if not root.is_dir():
    raise base.PackageError("managed root must be a directory")

  entries = list(root.iterdir())
  marker = root / base.MARKER
  if not marker.exists():
    if entries:
      raise base.PackageError("refusing to adopt a non-empty unmanaged directory")
    return {
      "preexisting": True,
      "empty_unmanaged": True,
      "previous_current": None,
      "anchors_preexisting": False,
    }

  base.require_managed_root(root)
  current_path = root / base.CURRENT
  if current_path.is_symlink():
    raise base.PackageError("current release pointer must not be a symlink")
  if not current_path.is_file():
    raise base.PackageError(
      "existing managed marker without a current release is incomplete; explicit recovery is required"
    )
  previous_current = base.current_state(root)
  anchors = root / ANCHOR_DIR
  if anchors.is_symlink() or not anchors.is_dir():
    raise base.PackageError(
      "existing managed root without real trust anchors is incomplete; explicit recovery is required"
    )
  return {
    "preexisting": True,
    "empty_unmanaged": False,
    "previous_current": previous_current,
    "anchors_preexisting": True,
  }


def _cleanup_failed_install(
  root: Path,
  version: str,
  previous_current: Mapping[str, Any] | None,
  anchors_preexisting: bool,
  *,
  root_preexisting: bool,
  root_was_empty_unmanaged: bool,
) -> None:
  if not root.exists() or root.is_symlink():
    return
  base.require_managed_root(root)
  current_path = root / base.CURRENT
  if current_path.is_symlink():
    raise base.PackageError("cannot safely recover a symlinked current pointer")
  if current_path.is_file():
    current = base.current_state(root)
    if current.get("version") == version:
      if previous_current is None:
        current_path.unlink()
      else:
        base.write_json(current_path, previous_current)

  release_root = root / "releases" / version
  if release_root.exists() or release_root.is_symlink():
    if release_root.is_symlink():
      raise base.PackageError("cannot safely recover a symlinked release directory")
    shutil.rmtree(base.resolved_within(root, release_root))
  staging = root / "releases" / f".{version}.{os.getpid()}.staging"
  if staging.exists() or staging.is_symlink():
    if staging.is_symlink():
      raise base.PackageError("cannot safely recover a symlinked staging directory")
    shutil.rmtree(base.resolved_within(root, staging))
  anchor_root = root / ANCHOR_DIR
  if not anchors_preexisting and previous_current is None and anchor_root.exists():
    if anchor_root.is_symlink():
      raise base.PackageError("cannot safely recover symlinked trust anchors")
    shutil.rmtree(base.resolved_within(root, anchor_root))

  if previous_current is None:
    releases_root = root / "releases"
    if releases_root.exists():
      if releases_root.is_symlink() or not releases_root.is_dir():
        raise base.PackageError("cannot safely recover an unsafe releases directory")
      base.resolved_within(root, releases_root)
      if not any(releases_root.iterdir()):
        releases_root.rmdir()
    marker = root / base.MARKER
    if marker.is_symlink():
      raise base.PackageError("cannot safely recover a symlinked ownership marker")
    if marker.is_file():
      marker.unlink()
    if not root_preexisting:
      if any(root.iterdir()):
        raise base.PackageError("new managed root recovery left unexpected files behind")
      root.rmdir()
    elif root_was_empty_unmanaged and any(root.iterdir()):
      raise base.PackageError("empty target recovery left unexpected files behind")


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
  version = base.safe_version(release.get("version"))
  root_state = _install_root_state(root)
  previous_current = root_state["previous_current"]
  anchors_preexisting = bool(root_state["anchors_preexisting"])
  if previous_current is not None:
    ensure_trust_anchors(
      root,
      release_public_key,
      entitlement_public_key,
      allow_create=False,
    )

  try:
    base.install(
      root,
      artifacts,
      manifest_path,
      entitlement_path,
      public_key=release_public_key,
    )
    ensure_trust_anchors(
      root,
      release_public_key,
      entitlement_public_key,
      allow_create=previous_current is None,
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
  except Exception as exc:
    try:
      _cleanup_failed_install(
        root,
        version,
        previous_current,
        anchors_preexisting,
        root_preexisting=bool(root_state["preexisting"]),
        root_was_empty_unmanaged=bool(root_state["empty_unmanaged"]),
      )
    except Exception as cleanup_exc:
      raise base.PackageError(
        f"secure install failed and recovery was incomplete: {type(cleanup_exc).__name__}"
      ) from exc
    raise


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
    "package_integrity": "verified_against_signed_release_and_pinned_anchor",
    "entitlement_integrity": "signed_active_release_bound_and_pinned_anchor",
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
  previous = base.current_state(root)
  verify_installed_trust(root, version)
  try:
    base.rollback(root, version)
    return doctor(root)
  except Exception:
    current_path = root / base.CURRENT
    if current_path.is_file() and not current_path.is_symlink():
      current = base.current_state(root)
      if current.get("version") == version:
        base.write_json(current_path, previous)
    raise


def uninstall(root: Path) -> dict[str, Any]:
  verified = doctor(root)
  result = base.uninstall(root)
  result["pre_delete_verification"] = "signed_current_release_and_pinned_anchors"
  result["verified_version"] = verified["version"]
  return result


def _write_payload(path: Path, payload: bytes) -> None:
  path.write_bytes(payload)


def _sign(private_key: Path, payload: bytes, output: Path) -> None:
  with tempfile.NamedTemporaryFile(prefix="local-ai-os-sign-", delete=False) as handle:
    payload_path = Path(handle.name)
    handle.write(payload_bytes := payload)
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
    third = signed_fixture(
      work,
      "0.0.3-secure-test",
      "c",
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

    unsigned = base.synthetic_release(work, "0.0.4-unsigned-test", "d")
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

    marker_only = work / "marker-only"
    marker_only.mkdir()
    base.write_json(marker_only / base.MARKER, {
      "schema_version": base.MANAGED_SCHEMA,
      "product_id": base.PRODUCT_ID,
    })
    (marker_only / "keep.txt").write_text("keep\n", encoding="utf-8")
    marker_only_adoption_rejected = base.expect_blocked(lambda: install(
      marker_only,
      first[0],
      first[1],
      first[2],
      release_public_key,
      first[3],
      entitlement_public_key,
    ))
    if not (marker_only / "keep.txt").is_file():
      raise base.PackageError("marker-only rejection mutated unrelated target contents")

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

    alternate_release_private, alternate_release_public = _generate_keypair(work, "alternate-release")
    alternate_entitlement_private, alternate_entitlement_public = _generate_keypair(work, "alternate-entitlement")
    alternate = signed_fixture(
      work,
      "0.0.5-alternate-key-test",
      "e",
      alternate_release_private,
      alternate_release_public,
      alternate_entitlement_private,
      alternate_entitlement_public,
    )
    trust_anchor_substitution_rejected = base.expect_blocked(lambda: install(
      root,
      alternate[0],
      alternate[1],
      alternate[2],
      alternate_release_public,
      alternate[3],
      alternate_entitlement_public,
    ))
    if base.current_state(root).get("version") != "0.0.2-secure-test":
      raise base.PackageError("rejected trust-anchor substitution changed current release")

    original_persist_trust = persist_trust

    def fail_persist_trust(*args, **kwargs):
      raise base.PackageError("injected trust persistence failure")

    globals()["persist_trust"] = fail_persist_trust
    try:
      transactional_install_failure_recovered = base.expect_blocked(lambda: install(
        root,
        third[0],
        third[1],
        third[2],
        release_public_key,
        third[3],
        entitlement_public_key,
      ))
    finally:
      globals()["persist_trust"] = original_persist_trust
    if base.current_state(root).get("version") != "0.0.2-secure-test":
      raise base.PackageError("failed secure install changed current release")
    if (root / "releases" / "0.0.3-secure-test").exists():
      raise base.PackageError("failed secure install left release payload behind")
    doctor(root)

    rollback_result = rollback(root, "0.0.1-secure-test")
    acceptance_result = acceptance(root)

    installed_entitlement = root / "releases" / "0.0.1-secure-test" / "entitlement.json"
    original_entitlement = base.read_json(installed_entitlement)
    tampered_entitlement = dict(original_entitlement)
    tampered_entitlement["entitlement_id"] = "tampered-after-install"
    base.write_json(installed_entitlement, tampered_entitlement)
    installed_entitlement_tamper_rejected = base.expect_blocked(lambda: doctor(root))
    secure_uninstall_tamper_rejected = base.expect_blocked(lambda: uninstall(root))
    if not root.is_dir():
      raise base.PackageError("secure uninstall removed a package whose trust verification failed")
    base.write_json(installed_entitlement, original_entitlement)
    doctor(root)

    anchor_release_key = root / ANCHOR_DIR / "release-public-key.pem"
    original_anchor_key = anchor_release_key.read_bytes()
    anchor_release_key.write_bytes(alternate_release_public.read_bytes())
    trust_anchor_tamper_rejected = base.expect_blocked(lambda: doctor(root))
    anchor_release_key.write_bytes(original_anchor_key)
    os.chmod(anchor_release_key, 0o600)
    doctor(root)

    uninstall_result = uninstall(root)
    if root.exists():
      raise base.PackageError("secure synthetic uninstall left managed root behind")
    return {
      "status": "pass",
      "install": [first_result["version"], second_result["version"]],
      "rollback": rollback_result["version"],
      "acceptance": acceptance_result["acceptance"],
      "synthetic_release_rejected": synthetic_release_rejected,
      "forged_entitlement_rejected": forged_entitlement_rejected,
      "marker_only_adoption_rejected": marker_only_adoption_rejected,
      "installed_entitlement_tamper_rejected": installed_entitlement_tamper_rejected,
      "secure_uninstall_tamper_rejected": secure_uninstall_tamper_rejected,
      "trust_anchor_substitution_rejected": trust_anchor_substitution_rejected,
      "trust_anchor_tamper_rejected": trust_anchor_tamper_rejected,
      "transactional_install_failure_recovered": transactional_install_failure_recovered,
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
    print_json(uninstall(args.root))
  else:
    print_json(selftest())
  return 0


if __name__ == "__main__":
  try:
    raise SystemExit(main())
  except base.PackageError as exc:
    print(f"customer_package_secure=BLOCKED reason={exc}")
    raise SystemExit(2)
