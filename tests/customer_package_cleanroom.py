#!/usr/bin/env python3
"""End-to-end customer package clean-room acceptance on synthetic customer data.

This test exercises the real customer lifecycle CLI with production-shaped signed
artifacts. The installed payload is a deterministic runtime probe, not an AI model.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tarfile
import tempfile
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
SECURE_PATH = REPO_ROOT / "scripts" / "customer-package-secure.py"
SPEC = importlib.util.spec_from_file_location("local_ai_os_cleanroom_secure", SECURE_PATH)
if SPEC is None or SPEC.loader is None:
  raise RuntimeError("cannot load secure customer package module")
secure = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(secure)


def run(argv: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
  result = subprocess.run(
    argv,
    cwd=cwd,
    text=True,
    capture_output=True,
    check=False,
  )
  if result.returncode != 0:
    raise RuntimeError(
      f"command failed ({result.returncode}): {' '.join(argv)}\n"
      f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
    )
  return result


def run_cli(*args: str) -> dict[str, Any]:
  result = run([sys.executable, str(SECURE_PATH), *args], cwd=REPO_ROOT)
  try:
    value = json.loads(result.stdout)
  except json.JSONDecodeError as exc:
    raise RuntimeError(f"customer CLI did not return JSON: {result.stdout!r}") from exc
  if not isinstance(value, dict):
    raise RuntimeError("customer CLI JSON root must be an object")
  return value


def generate_keypair(root: Path, name: str) -> tuple[Path, Path]:
  private_key = root / f"{name}-private.pem"
  public_key = root / f"{name}-public.pem"
  run(["openssl", "genpkey", "-algorithm", "ED25519", "-out", str(private_key)])
  run([
    "openssl",
    "pkey",
    "-in",
    str(private_key),
    "-pubout",
    "-out",
    str(public_key),
  ])
  return private_key, public_key


def sign(private_key: Path, payload: bytes, output: Path, temp_root: Path) -> None:
  payload_path = temp_root / f"payload-{output.name}.bin"
  payload_path.write_bytes(payload)
  try:
    run([
      "openssl",
      "pkeyutl",
      "-sign",
      "-inkey",
      str(private_key),
      "-rawin",
      "-in",
      str(payload_path),
      "-out",
      str(output),
    ])
  finally:
    payload_path.unlink(missing_ok=True)


def artifact_row(path: Path, root: Path, kind: str) -> dict[str, Any]:
  return {
    "path": path.relative_to(root).as_posix(),
    "kind": kind,
    "sha256": secure.base.sha256_file(path),
    "size": path.stat().st_size,
  }


def runtime_probe_source(version: str) -> str:
  return f'''#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

VERSION = {version!r}


def main() -> int:
  parser = argparse.ArgumentParser()
  parser.add_argument("--project", type=Path, required=True)
  args = parser.parse_args()
  project = args.project.resolve(strict=True)
  source = project / "task.txt"
  if not source.is_file() or source.is_symlink():
    raise SystemExit("clean-room project task.txt is missing or unsafe")
  payload = source.read_bytes()
  result = {{
    "status": "pass",
    "runtime_version": VERSION,
    "input_sha256": hashlib.sha256(payload).hexdigest(),
  }}
  target = project / "workflow-result.json"
  target.write_text(json.dumps(result, sort_keys=True) + "\\n", encoding="utf-8")
  print(json.dumps(result, sort_keys=True))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
'''


def build_bundle(
  work: Path,
  version: str,
  source_sha: str,
  release_private: Path,
  release_public: Path,
  entitlement_private: Path,
  entitlement_public: Path,
) -> Path:
  bundle = work / f"bundle-{version}"
  artifacts = bundle / "artifacts"
  runtime_dir = artifacts / "runtime"
  signatures = bundle / "entitlement-signatures"
  runtime_dir.mkdir(parents=True)
  signatures.mkdir(parents=True)

  runtime = runtime_dir / "workflow.py"
  runtime.write_text(runtime_probe_source(version), encoding="utf-8")
  sbom = artifacts / "sbom.json"
  sbom.write_text(
    json.dumps({
      "schema": "cleanroom-sbom.v1",
      "test_only": True,
      "components": [{"name": "runtime/workflow.py", "version": version}],
    }, sort_keys=True) + "\n",
    encoding="utf-8",
  )
  provenance = artifacts / "provenance.json"
  provenance.write_text(
    json.dumps({
      "schema": "cleanroom-provenance.v1",
      "test_only": True,
      "source_sha": source_sha,
      "builder": "tests/customer_package_cleanroom.py",
    }, sort_keys=True) + "\n",
    encoding="utf-8",
  )

  release = {
    "schema_version": secure.base.RELEASE_SCHEMA,
    "product_id": secure.base.PRODUCT_ID,
    "version": version,
    "source_sha": source_sha,
    "artifacts": [
      artifact_row(runtime, artifacts, "payload"),
      artifact_row(sbom, artifacts, "sbom"),
      artifact_row(provenance, artifacts, "provenance"),
    ],
    "signing": {
      "algorithm": "ed25519",
      "key_id": secure.key_id(release_public),
      "status": "signed",
      "signature_path": "release.sig",
    },
  }
  release_path = bundle / "release.json"
  secure.base.write_json(release_path, release)
  sign(
    release_private,
    secure.base.canonical_release_bytes(release),
    artifacts / "release.sig",
    work,
  )

  entitlement = {
    "schema_version": secure.base.ENTITLEMENT_SCHEMA,
    "product_id": secure.base.PRODUCT_ID,
    "entitlement_id": f"cleanroom-{version}",
    "sku": "cleanroom-test-only",
    "release_version": version,
    "status": "active",
    "signing": {
      "algorithm": "ed25519",
      "key_id": secure.key_id(entitlement_public),
      "status": "signed",
      "signature_path": "entitlement.sig",
    },
  }
  entitlement_path = bundle / "entitlement.json"
  secure.base.write_json(entitlement_path, entitlement)
  sign(
    entitlement_private,
    secure.canonical_entitlement_bytes(entitlement),
    signatures / "entitlement.sig",
    work,
  )

  shutil.copy2(release_public, bundle / "release-public-key.pem")
  shutil.copy2(entitlement_public, bundle / "entitlement-public-key.pem")

  archive = work / f"local-ai-os-{version}.tar.gz"
  with tarfile.open(archive, "w:gz") as output:
    for path in sorted(bundle.rglob("*")):
      if path.is_file():
        output.add(path, arcname=path.relative_to(bundle), recursive=False)
  return archive


def extract_download(archive: Path, target: Path) -> str:
  digest_before = secure.base.sha256_file(archive)
  inbox = target.parent / f"download-{archive.name}"
  shutil.copy2(archive, inbox)
  digest_after = secure.base.sha256_file(inbox)
  if digest_before != digest_after:
    raise RuntimeError("download-equivalent archive digest changed in transit")
  target.mkdir()
  with tarfile.open(inbox, "r:gz") as source:
    for member in source.getmembers():
      member_path = Path(member.name)
      if member_path.is_absolute() or ".." in member_path.parts:
        raise RuntimeError(f"unsafe archive member: {member.name}")
      if member.issym() or member.islnk():
        raise RuntimeError(f"archive links are forbidden: {member.name}")
    source.extractall(target, filter="data")
  for path in target.rglob("*"):
    if not path.is_file():
      continue
    if "private" in path.name.casefold():
      raise RuntimeError(f"private material name leaked into customer bundle: {path.name}")
    if b"BEGIN PRIVATE KEY" in path.read_bytes():
      raise RuntimeError(f"private signing key leaked into customer bundle: {path.name}")
  return digest_after


def lifecycle_args(bundle: Path) -> list[str]:
  return [
    "--artifacts", str(bundle / "artifacts"),
    "--manifest", str(bundle / "release.json"),
    "--entitlement", str(bundle / "entitlement.json"),
    "--release-public-key", str(bundle / "release-public-key.pem"),
    "--entitlement-signatures", str(bundle / "entitlement-signatures"),
    "--entitlement-public-key", str(bundle / "entitlement-public-key.pem"),
  ]


def run_installed_probe(root: Path, project: Path, expected_version: str) -> dict[str, Any]:
  current = secure.base.current_state(root)
  version = str(current.get("version") or "")
  if version != expected_version:
    raise RuntimeError(f"unexpected current version: {version} != {expected_version}")
  runtime = root / "releases" / version / "artifacts" / "runtime" / "workflow.py"
  result = run([sys.executable, str(runtime), "--project", str(project)])
  value = json.loads(result.stdout)
  if value.get("status") != "pass" or value.get("runtime_version") != expected_version:
    raise RuntimeError(f"runtime probe failed: {value}")
  persisted = json.loads((project / "workflow-result.json").read_text(encoding="utf-8"))
  if persisted != value:
    raise RuntimeError("runtime probe report differs from process output")
  return value


def main() -> int:
  if platform.system().casefold() != "linux":
    raise RuntimeError("clean-room acceptance must run inside Linux")
  if shutil.which("openssl") is None:
    raise RuntimeError("openssl is required in the clean-room image")

  with tempfile.TemporaryDirectory(prefix="local-ai-os-cleanroom-") as temp:
    work = Path(temp)
    issuer = work / "issuer-private"
    issuer.mkdir(mode=0o700)
    release_private, release_public = generate_keypair(issuer, "release")
    entitlement_private, entitlement_public = generate_keypair(issuer, "entitlement")

    first_version = "0.1.0-cleanroom"
    second_version = "0.2.0-cleanroom"
    first_archive = build_bundle(
      work,
      first_version,
      "1" * 40,
      release_private,
      release_public,
      entitlement_private,
      entitlement_public,
    )
    second_archive = build_bundle(
      work,
      second_version,
      "2" * 40,
      release_private,
      release_public,
      entitlement_private,
      entitlement_public,
    )

    first = work / "received-first"
    second = work / "received-second"
    first_digest = extract_download(first_archive, first)
    second_digest = extract_download(second_archive, second)

    facts = work / "compatibility.json"
    arch = platform.machine()
    if arch not in {"x86_64", "aarch64"}:
      raise RuntimeError(f"unsupported clean-room architecture: {arch}")
    facts.write_text(json.dumps({
      "schema_version": secure.base.FACTS_SCHEMA,
      "os": "linux",
      "arch": arch,
      "target_writable": True,
      "disk_free_mb": 2048,
    }) + "\n", encoding="utf-8")
    compatibility = run_cli("compatibility", "--facts", str(facts))
    if compatibility.get("result") != "supported":
      raise RuntimeError(f"clean-room compatibility failed: {compatibility}")

    verified_first = run_cli("verify", *lifecycle_args(first))
    if verified_first.get("status") != "pass":
      raise RuntimeError(f"first release verification failed: {verified_first}")

    root_parent = work / "customer"
    root_parent.mkdir()
    root = root_parent / "local-ai-os"
    installed_first = run_cli("install", "--root", str(root), *lifecycle_args(first))
    if installed_first.get("status") != "pass" or installed_first.get("version") != first_version:
      raise RuntimeError(f"first install failed: {installed_first}")

    doctor_first = run_cli("doctor", "--root", str(root))
    if doctor_first.get("status") != "pass" or doctor_first.get("runtime_and_live") != "unknown":
      raise RuntimeError(f"first doctor contract drifted: {doctor_first}")

    project = work / "synthetic-customer-project"
    project.mkdir()
    (project / "task.txt").write_text(
      "Synthetic customer acceptance task. No owner or customer secrets.\n",
      encoding="utf-8",
    )
    first_probe = run_installed_probe(root, project, first_version)

    (project / "workflow-result.json").unlink()
    restart_doctor = run_cli("doctor", "--root", str(root))
    restart_probe = run_installed_probe(root, project, first_version)
    if restart_doctor.get("version") != first_version or restart_probe != first_probe:
      raise RuntimeError("fresh-process restart acceptance changed state or output")

    package_acceptance = run_cli("acceptance", "--root", str(root))
    if package_acceptance.get("acceptance") != "signed_customer_package_mechanics_verified":
      raise RuntimeError(f"package acceptance failed: {package_acceptance}")
    if package_acceptance.get("production_acceptance") != "unknown":
      raise RuntimeError("clean-room probe must not claim production customer acceptance")

    verified_second = run_cli("verify", *lifecycle_args(second))
    if verified_second.get("status") != "pass":
      raise RuntimeError(f"second release verification failed: {verified_second}")
    installed_second = run_cli("install", "--root", str(root), *lifecycle_args(second))
    if installed_second.get("version") != second_version:
      raise RuntimeError(f"update did not select second release: {installed_second}")
    second_probe = run_installed_probe(root, project, second_version)

    rollback = run_cli("rollback", "--root", str(root), "--to", first_version)
    if rollback.get("version") != first_version:
      raise RuntimeError(f"rollback failed: {rollback}")
    rollback_probe = run_installed_probe(root, project, first_version)

    installed_payload = root / "releases" / first_version / "artifacts" / "runtime" / "workflow.py"
    original_payload = installed_payload.read_bytes()
    installed_payload.write_bytes(original_payload + b"\n# tamper\n")
    tampered = subprocess.run(
      [sys.executable, str(SECURE_PATH), "doctor", "--root", str(root)],
      cwd=REPO_ROOT,
      text=True,
      capture_output=True,
      check=False,
    )
    if tampered.returncode == 0 or "BLOCKED" not in tampered.stdout:
      raise RuntimeError("doctor accepted a tampered installed payload")
    installed_payload.write_bytes(original_payload)
    if run_cli("doctor", "--root", str(root)).get("status") != "pass":
      raise RuntimeError("doctor did not recover after restoring exact payload")

    uninstall = run_cli("uninstall", "--root", str(root))
    if uninstall.get("status") != "uninstalled" or root.exists():
      raise RuntimeError(f"secure uninstall failed: {uninstall}")

    summary = {
      "status": "pass",
      "isolation": {
        "filesystem": "source files mounted read-only by wrapper",
        "network": "none enforced by wrapper",
        "host_home": "not mounted",
        "customer_data": "synthetic only",
      },
      "download_equivalent": {
        "first_sha256": first_digest,
        "second_sha256": second_digest,
        "private_signing_material_in_bundle": False,
      },
      "lifecycle": {
        "compatibility": compatibility["result"],
        "verify": "pass",
        "install": first_version,
        "doctor": doctor_first["status"],
        "fresh_process_restart": "pass",
        "update": second_version,
        "rollback": rollback["version"],
        "tamper_detection": "pass",
        "uninstall": uninstall["status"],
      },
      "installed_runtime_probe": {
        "first": first_probe,
        "updated": second_probe,
        "rolled_back": rollback_probe,
        "kind": "deterministic_test_payload_only",
      },
      "truth_boundary": {
        "real_ai_model_or_agent": "not_tested",
        "production_signing_authority": "not_tested",
        "production_entitlement_issuance": "not_tested",
        "real_customer_acceptance": "not_tested",
      },
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
