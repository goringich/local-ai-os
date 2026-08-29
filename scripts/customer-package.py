#!/usr/bin/env python3
"""Source-side customer package harness for LOCAL AI OS.

The harness proves package mechanics in a bounded target root. It does not issue
entitlements, perform payments, create production signatures, or claim live readiness.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
from typing import Any, Mapping


PRODUCT_ID = "local-ai-os"
MARKER = ".local-ai-os-managed-root"
CURRENT = "current.json"
MANAGED_ROOT_SCHEMA = "2026-08-30.local-ai-os-managed-root.v1"
RELEASE_SCHEMA = "2026-08-30.local-ai-os-release.v1"
ENTITLEMENT_SCHEMA = "2026-08-30.local-ai-os-entitlement.v1"
FACTS_SCHEMA = "2026-08-30.local-ai-os-compatibility.v1"


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
  temp.write_text(json.dumps(dict(value), ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
  os.replace(temp, path)


def sha256_file(path: Path) -> str:
  digest = hashlib.sha256()
  with path.open("rb") as handle:
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
      digest.update(chunk)
  return digest.hexdigest()


def safe_relative(value: Any) -> Path:
  raw = str(value or "").strip()
  path = Path(raw)
  if not raw or path.is_absolute() or ".." in path.parts:
    raise PackageError(f"unsafe package path: {raw or '<empty>'}")
  return path


def full_sha(value: Any, length: int) -> bool:
  raw = str(value or "")
  return len(raw) == length and all(char in "0123456789abcdef" for char in raw)


def validate_entitlement(entitlement: Mapping[str, Any], release: Mapping[str, Any]) -> None:
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
) -> list[dict[str, Any]]:
  if release.get("schema_version") != RELEASE_SCHEMA:
    raise PackageError("unsupported release manifest schema")
  if release.get("product_id") != PRODUCT_ID:
    raise PackageError("release product mismatch")
  version = str(release.get("version") or "").strip()
  if not version:
    raise PackageError("release version is required")
  source_sha = release.get("source_sha")
  if not full_sha(source_sha, 40):
    raise PackageError("release source_sha must be a full lowercase git SHA")
  validate_entitlement(entitlement, release)

  signing = release.get("signing")
  signing = signing if isinstance(signing, Mapping) else {}
  signing_status = signing.get("status")
  if signing_status == "synthetic_test_only":
    if not allow_synthetic_signature:
      raise PackageError("synthetic signature evidence is forbidden outside explicit test mode")
  elif signing_status != "verified":
    raise PackageError("production release requires verified detached-signature evidence")
  if not str(signing.get("algorithm") or "").strip():
    raise PackageError("signing algorithm is required")
  if not str(signing.get("key_id") or "").strip():
    raise PackageError("signing key id is required")
  if signing_status == "verified" and not full_sha(signing.get("receipt_sha256"), 64):
    raise PackageError("verified signing receipt digest is required")

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
    if not full_sha(expected_digest, 64):
      raise PackageError(f"invalid artifact digest: {relative}")
    expected_size = raw.get("size")
    if not isinstance(expected_size, int) or expected_size < 0:
      raise PackageError(f"invalid artifact size: {relative}")
    source = artifact_root / relative
    if not source.is_file() or source.is_symlink():
      raise PackageError(f"artifact missing or unsafe: {relative}")
    actual_size = source.stat().st_size
    actual_digest = sha256_file(source)
    if actual_size != expected_size:
      raise PackageError(f"artifact size mismatch: {relative}")
    if actual_digest != expected_digest:
      raise PackageError(f"artifact digest mismatch: {relative}")
    kind = str(raw.get("kind") or "payload")
    kinds.add(kind)
    verified.append({
      "path": str(relative),
      "kind": kind,
      "size": actual_size,
      "sha256": actual_digest,
    })
  if "sbom" not in kinds:
    raise PackageError("release must include an SBOM/equivalent inventory artifact")
  if "provenance" not in kinds:
    raise PackageError("release must include a provenance artifact")
  return verified


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
  if blockers:
    result = "unsupported"
  elif actions:
    result = "needs_action"
  else:
    result = "supported"
  return {
    "result": result,
    "blockers": blockers,
    "actions": actions,
    "runtime_and_live": "unknown",
  }


def require_managed_root(root: Path) -> dict[str, Any]:
  marker = root / MARKER
  if not marker.is_file() or marker.is_symlink():
    raise PackageError("target is not a LOCAL AI OS managed root")
  value = read_json(marker)
  if value.get("schema_version") != MANAGED_ROOT_SCHEMA:
    raise PackageError("managed root marker schema mismatch")
  if value.get("product_id") != PRODUCT_ID:
    raise PackageError("managed root product mismatch")
  return value


def current_state(root: Path) -> dict[str, Any]:
  return read_json(root / CURRENT)


def verify_installed_release(root: Path, version: str) -> dict[str, Any]:
  release_root = root / "releases" / version
  manifest_path = release_root / "release-manifest.json"
  if not manifest_path.is_file():
    raise PackageError(f"installed release manifest missing: {version}")
  manifest = read_json(manifest_path)
  rows = manifest.get("artifacts")
  if not isinstance(rows, list) or not rows:
    raise PackageError("installed release artifact inventory missing")
  for raw in rows:
    if not isinstance(raw, Mapping):
      raise PackageError("installed artifact row invalid")
    relative = safe_relative(raw.get("path"))
    target = release_root / "artifacts" / relative
    if not target.is_file() or target.is_symlink():
      raise PackageError(f"installed artifact missing: {relative}")
    if target.stat().st_size != raw.get("size"):
      raise PackageError(f"installed artifact size mismatch: {relative}")
    if sha256_file(target) != raw.get("sha256"):
      raise PackageError(f"installed artifact digest mismatch: {relative}")
  return manifest


def install(
  root: Path,
  artifact_root: Path,
  manifest_path: Path,
  entitlement_path: Path,
  *,
  allow_synthetic_signature: bool = False,
) -> dict[str, Any]:
  release = read_json(manifest_path)
  entitlement = read_json(entitlement_path)
  verified = validate_release(
    release,
    artifact_root,
    entitlement,
    allow_synthetic_signature=allow_synthetic_signature,
  )
  version = str(release["version"])
  root.mkdir(parents=True, exist_ok=True)
  marker = root / MARKER
  if marker.exists():
    require_managed_root(root)
  else:
    write_json(marker, {
      "schema_version": MANAGED_ROOT_SCHEMA,
      "product_id": PRODUCT_ID,
    })
  release_root = root / "releases" / version
  if release_root.exists():
    raise PackageError(f"release already installed: {version}")
  staging = root / "releases" / f".{version}.{os.getpid()}.staging"
  if staging.exists():
    shutil.rmtree(staging)
  artifacts_target = staging / "artifacts"
  artifacts_target.mkdir(parents=True)
  for row in verified:
    relative = Path(row["path"])
    target = artifacts_target / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(artifact_root / relative, target)
  write_json(staging / "release-manifest.json", release)
  write_json(staging / "entitlement.json", entitlement)
  staging.rename(release_root)
  previous = ""
  current_path = root / CURRENT
  if current_path.is_file():
    previous = str(current_state(root).get("version") or "")
  write_json(current_path, {
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
  version = str(current.get("version") or "")
  if not version:
    raise PackageError("current release version is missing")
  manifest = verify_installed_release(root, version)
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
  result.update({
    "acceptance": "source_package_mechanics_verified",
    "production_acceptance": "unknown",
  })
  return result


def rollback(root: Path, version: str) -> dict[str, Any]:
  require_managed_root(root)
  current = current_state(root)
  current_version = str(current.get("version") or "")
  if not current_version:
    raise PackageError("current version is missing")
  verify_installed_release(root, version)
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


def synthetic_release(work: Path, version: str, source_char: str) -> tuple[Path, Path, Path]:
  artifacts = work / f"artifacts-{version}"
  artifacts.mkdir()
  payload = artifacts / "payload.txt"
  payload.write_text(f"LOCAL AI OS synthetic payload {version}\n", encoding="utf-8")
  sbom = artifacts / "sbom.json"
  sbom.write_text(json.dumps({"synthetic": True, "version": version}) + "\n", encoding="utf-8")
  provenance = artifacts / "provenance.json"
  provenance.write_text(json.dumps({"source_sha": source_char * 40, "synthetic": True}) + "\n", encoding="utf-8")
  rows = []
  for path, kind in (
    (payload, "payload"),
    (sbom, "sbom"),
    (provenance, "provenance"),
  ):
    rows.append({
      "path": path.name,
      "kind": kind,
      "sha256": sha256_file(path),
      "size": path.stat().st_size,
    })
  release = work / f"release-{version}.json"
  write_json(release, {
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
  return artifacts, release, entitlement


def selftest() -> dict[str, Any]:
  with tempfile.TemporaryDirectory() as temp:
    work = Path(temp)
    root = work / "clean-target"
    first = synthetic_release(work, "0.0.1-test", "a")
    second = synthetic_release(work, "0.0.2-test", "b")
    try:
      validate_release(read_json(first[1]), first[0], read_json(first[2]))
    except PackageError:
      synthetic_rejected_without_flag = True
    else:
      raise PackageError("synthetic signature unexpectedly passed production verification")
    unmanaged = work / "unmanaged"
    unmanaged.mkdir()
    try:
      uninstall(unmanaged)
    except PackageError:
      unmanaged_delete_rejected = True
    else:
      raise PackageError("unmanaged directory unexpectedly passed uninstall guard")
    first_result = install(root, *first, allow_synthetic_signature=True)
    if first_result["version"] != "0.0.1-test":
      raise PackageError("first synthetic install failed")
    second_result = install(root, *second, allow_synthetic_signature=True)
    if second_result["version"] != "0.0.2-test":
      raise PackageError("second synthetic install failed")
    rollback_result = rollback(root, "0.0.1-test")
    if rollback_result["version"] != "0.0.1-test":
      raise PackageError("synthetic rollback failed")
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
      "signature_evidence": "synthetic_test_only",
      "synthetic_rejected_without_flag": synthetic_rejected_without_flag,
      "unmanaged_delete_rejected": unmanaged_delete_rejected,
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
  verify_parser.add_argument("--allow-synthetic-signature", action="store_true")

  install_parser = sub.add_parser("install")
  install_parser.add_argument("--root", type=Path, required=True)
  install_parser.add_argument("--artifacts", type=Path, required=True)
  install_parser.add_argument("--manifest", type=Path, required=True)
  install_parser.add_argument("--entitlement", type=Path, required=True)
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
    release = read_json(args.manifest)
    entitlement = read_json(args.entitlement)
    rows = validate_release(
      release,
      args.artifacts,
      entitlement,
      allow_synthetic_signature=args.allow_synthetic_signature,
    )
    print_json({
      "status": "pass",
      "artifacts_verified": len(rows),
      "runtime_and_live": "unknown",
    })
  elif args.command == "install":
    print_json(install(
      args.root,
      args.artifacts,
      args.manifest,
      args.entitlement,
      allow_synthetic_signature=args.allow_synthetic_signature,
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
