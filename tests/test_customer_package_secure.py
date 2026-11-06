from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import shutil
import stat
import tempfile
import unittest
from unittest import mock


REPO_ROOT = Path(__file__).resolve().parents[1]
SECURE_PATH = REPO_ROOT / "scripts" / "customer-package-secure.py"
SPEC = importlib.util.spec_from_file_location("local_ai_os_customer_package_secure_test", SECURE_PATH)
if SPEC is None or SPEC.loader is None:
  raise RuntimeError("cannot load secure customer package module")
secure = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(secure)


def canonical_entitlement_bytes(entitlement: dict) -> bytes:
  payload = json.loads(json.dumps(entitlement))
  signing = dict(payload.get("signing") or {})
  signing.pop("signature_path", None)
  payload["signing"] = signing
  return json.dumps(
    payload,
    ensure_ascii=False,
    sort_keys=True,
    separators=(",", ":"),
  ).encode("utf-8")


class SecureCustomerPackageTest(unittest.TestCase):
  def setUp(self) -> None:
    self.temp = tempfile.TemporaryDirectory()
    self.work = Path(self.temp.name)
    self.root = self.work / "managed"
    self.release_private, self.release_public = self._generate_keypair("release")
    self.entitlement_private, self.entitlement_public = self._generate_keypair("entitlement")
    self.first = self._fixture("0.0.1-external-test", "a")
    self.second = self._fixture("0.0.2-external-test", "b")
    self.third = self._fixture("0.0.3-external-test", "c")

  def tearDown(self) -> None:
    self.temp.cleanup()

  def _key_id(self, public_key: Path) -> str:
    return f"sha256:{secure.base.sha256_file(public_key)}"

  def _generate_keypair(self, stem: str) -> tuple[Path, Path]:
    private_key = self.work / f"{stem}-private.pem"
    public_key = self.work / f"{stem}-public.pem"
    secure.base.openssl(["genpkey", "-algorithm", "ED25519", "-out", str(private_key)])
    secure.base.openssl(["pkey", "-in", str(private_key), "-pubout", "-out", str(public_key)])
    return private_key, public_key

  def _sign(self, private_key: Path, payload: bytes, output: Path) -> None:
    with tempfile.NamedTemporaryFile(dir=self.work, delete=False) as handle:
      payload_path = Path(handle.name)
      handle.write(payload)
    try:
      secure.base.openssl([
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

  def _fixture(
    self,
    version: str,
    source_char: str,
    *,
    release_private: Path | None = None,
    release_public: Path | None = None,
    entitlement_private: Path | None = None,
    entitlement_public: Path | None = None,
  ) -> tuple[Path, Path, Path, Path]:
    release_private = release_private or self.release_private
    release_public = release_public or self.release_public
    entitlement_private = entitlement_private or self.entitlement_private
    entitlement_public = entitlement_public or self.entitlement_public

    artifacts, manifest_path, entitlement_path = secure.base.synthetic_release(
      self.work,
      version,
      source_char,
    )
    release = secure.base.read_json(manifest_path)
    release["signing"] = {
      "algorithm": "ed25519",
      "key_id": self._key_id(release_public),
      "status": "signed",
      "signature_path": "release.sig",
    }
    secure.base.write_json(manifest_path, release)
    self._sign(
      release_private,
      secure.base.canonical_release_bytes(release),
      artifacts / "release.sig",
    )

    signature_root = self.work / f"entitlement-signatures-{version}"
    signature_root.mkdir()
    entitlement = secure.base.read_json(entitlement_path)
    entitlement["signing"] = {
      "algorithm": "ed25519",
      "key_id": self._key_id(entitlement_public),
      "status": "signed",
      "signature_path": "entitlement.sig",
    }
    secure.base.write_json(entitlement_path, entitlement)
    self._sign(
      entitlement_private,
      canonical_entitlement_bytes(entitlement),
      signature_root / "entitlement.sig",
    )
    return artifacts, manifest_path, entitlement_path, signature_root

  def _install(
    self,
    fixture: tuple[Path, Path, Path, Path],
    *,
    release_public: Path | None = None,
    entitlement_public: Path | None = None,
  ) -> dict:
    return secure.install(
      self.root,
      fixture[0],
      fixture[1],
      fixture[2],
      release_public or self.release_public,
      fixture[3],
      entitlement_public or self.entitlement_public,
    )

  def test_signatures_and_entitlement_are_fail_closed(self) -> None:
    release = secure.base.read_json(self.first[1])
    entitlement = secure.base.read_json(self.first[2])
    verified = secure.verify_bundle(
      release,
      self.first[0],
      entitlement,
      self.release_public,
      self.first[3],
      self.entitlement_public,
    )
    self.assertGreaterEqual(len(verified), 3)

    unsigned = secure.base.synthetic_release(self.work, "0.0.4-unsigned-external", "d")
    with self.assertRaises(secure.base.PackageError):
      secure.verify_bundle(
        secure.base.read_json(unsigned[1]),
        unsigned[0],
        secure.base.read_json(unsigned[2]),
        self.release_public,
        self.work,
        self.entitlement_public,
      )

    forged = dict(entitlement)
    forged["entitlement_id"] = "forged-but-structurally-valid"
    forged_path = self.work / "forged-entitlement.json"
    secure.base.write_json(forged_path, forged)
    with self.assertRaises(secure.base.PackageError):
      secure.verify_bundle(
        release,
        self.first[0],
        secure.base.read_json(forged_path),
        self.release_public,
        self.first[3],
        self.entitlement_public,
      )

  def test_install_rejects_incomplete_ownership_and_recovers_transactionally(self) -> None:
    marker_only = self.work / "marker-only"
    marker_only.mkdir()
    secure.base.write_json(marker_only / secure.base.MARKER, {
      "schema_version": secure.base.MANAGED_SCHEMA,
      "product_id": secure.base.PRODUCT_ID,
    })
    marker_sentinel = marker_only / "keep.txt"
    marker_sentinel.write_text("keep\n", encoding="utf-8")
    original_root = self.root
    self.root = marker_only
    try:
      with self.assertRaises(secure.base.PackageError):
        self._install(self.first)
    finally:
      self.root = original_root
    self.assertTrue(marker_sentinel.is_file())

    self._install(self.first)
    self._install(self.second)
    original_persist_trust = secure.persist_trust

    def fail_persist_trust(*args, **kwargs):
      raise secure.base.PackageError("injected trust persistence failure")

    secure.persist_trust = fail_persist_trust
    try:
      with self.assertRaises(secure.base.PackageError):
        self._install(self.third)
    finally:
      secure.persist_trust = original_persist_trust

    self.assertEqual(secure.base.current_state(self.root)["version"], "0.0.2-external-test")
    self.assertFalse((self.root / "releases" / "0.0.3-external-test").exists())
    self.assertEqual(secure.doctor(self.root)["status"], "pass")

  def test_updates_reject_concurrency_reinstall_staging_and_tampered_current_state(self) -> None:
    self._install(self.first)
    self._install(self.second)

    with secure._lifecycle_lock(self.root):
      with self.assertRaises(secure.base.PackageError):
        self._install(self.third)
      with self.assertRaises(secure.base.PackageError):
        secure.rollback(self.root, "0.0.1-external-test")
      with self.assertRaises(secure.base.PackageError):
        secure.uninstall(self.root)

    existing_release = self.root / "releases" / "0.0.2-external-test"
    existing_manifest = existing_release / "release-manifest.json"
    existing_digest = secure.base.sha256_file(existing_manifest)
    with self.assertRaises(secure.base.PackageError):
      self._install(self.second)
    self.assertEqual(secure.base.sha256_file(existing_manifest), existing_digest)

    staging = self.root / "releases" / f".0.0.3-external-test.{os.getpid()}.staging"
    staging.mkdir()
    staging_sentinel = staging / "keep.txt"
    staging_sentinel.write_text("keep\n", encoding="utf-8")
    with self.assertRaises(secure.base.PackageError):
      self._install(self.third)
    self.assertTrue(staging_sentinel.is_file())
    shutil.rmtree(staging)

    current_entitlement = existing_release / "entitlement.json"
    original_entitlement = secure.base.read_json(current_entitlement)
    tampered_entitlement = dict(original_entitlement)
    tampered_entitlement["entitlement_id"] = "tampered-before-update"
    secure.base.write_json(current_entitlement, tampered_entitlement)
    with self.assertRaises(secure.base.PackageError):
      self._install(self.third)
    self.assertEqual(secure.base.current_state(self.root)["version"], "0.0.2-external-test")
    self.assertFalse((self.root / "releases" / "0.0.3-external-test").exists())
    secure.base.write_json(current_entitlement, original_entitlement)
    self.assertEqual(secure.doctor(self.root)["status"], "pass")

  def _installed_snapshot(self) -> dict | None:
    if not self.root.exists():
      return None
    result = {".": ("directory", stat.S_IMODE(self.root.stat().st_mode))}
    for path in self.root.rglob("*"):
      relative = str(path.relative_to(self.root))
      mode = stat.S_IMODE(path.lstat().st_mode)
      if path.is_symlink():
        result[relative] = ("symlink", mode, os.readlink(path))
      elif path.is_file():
        result[relative] = ("file", mode, path.read_bytes())
      else:
        result[relative] = ("directory", mode)
    return result

  def test_json_publication_never_follows_predictable_temp_symlink(self) -> None:
    self._install(self.first)
    current = self.root / secure.base.CURRENT
    current.chmod(0o640)
    victim = self.work / "outside-customer-data.txt"
    victim.write_text("synthetic customer data remains unchanged\n", encoding="utf-8")
    malicious = current.with_name(f".{current.name}.{os.getpid()}.tmp")
    malicious.symlink_to(victim)

    self._install(self.second)

    self.assertEqual(victim.read_text(), "synthetic customer data remains unchanged\n")
    self.assertTrue(malicious.is_symlink())
    self.assertFalse(current.is_symlink())
    self.assertEqual(stat.S_IMODE(current.stat().st_mode), 0o640)
    self.assertEqual(secure.doctor(self.root)["version"], "0.0.2-external-test")
    self.assertEqual(list(self.root.glob(".current.json.*.tmp")), [malicious])

  def test_failed_json_replace_preserves_original_and_cleans_owned_temp(self) -> None:
    target = self.work / "atomic-state.json"
    target.write_text('{"original": true}\n', encoding="utf-8")
    target.chmod(0o640)
    before = set(self.work.iterdir())
    with mock.patch.object(secure.base.os, "replace", side_effect=OSError("synthetic publication failure")):
      with self.assertRaises(OSError):
        secure.base.write_json(target, {"replacement": True})
    self.assertEqual(target.read_text(), '{"original": true}\n')
    self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o640)
    self.assertEqual(set(self.work.iterdir()), before)

  def test_interrupted_install_restores_absent_empty_and_installed_targets(self) -> None:
    original_root = self.root
    original_persist = secure.persist_trust
    try:
      for state in ("absent", "empty", "installed"):
        for after_persist in (False, True):
          with self.subTest(state=state, after_persist=after_persist):
            self.root = self.work / f"interrupted-{state}-{after_persist}"
            if state == "empty":
              self.root.mkdir(mode=0o750)
            elif state == "installed":
              self._install(self.first)
              (self.root / "customer-sentinel.txt").write_text("preserve unrelated customer data\n")
            before = self._installed_snapshot()

            def interrupt(*args, **kwargs):
              if after_persist:
                original_persist(*args, **kwargs)
              raise KeyboardInterrupt("synthetic interrupted trust persistence")

            with mock.patch.object(secure, "persist_trust", side_effect=interrupt):
              with self.assertRaises(KeyboardInterrupt):
                self._install(self.second if state == "installed" else self.first)
            self.assertEqual(self._installed_snapshot(), before)
            if state == "installed":
              self.assertEqual(secure.doctor(self.root)["version"], "0.0.1-external-test")
    finally:
      self.root = original_root

  def test_interrupted_rollback_restores_pointer_without_deleting_releases(self) -> None:
    self._install(self.first)
    self._install(self.second)
    before = self._installed_snapshot()
    with mock.patch.object(secure, "doctor", side_effect=KeyboardInterrupt("synthetic rollback interruption")):
      with self.assertRaises(KeyboardInterrupt):
        secure.rollback(self.root, "0.0.1-external-test")
    self.assertEqual(self._installed_snapshot(), before)
    self.assertEqual(secure.doctor(self.root)["version"], "0.0.2-external-test")

  def test_interrupted_copy_cleans_only_its_unique_staging_directory(self) -> None:
    self._install(self.first)
    before = self._installed_snapshot()
    legacy = self.root / "releases" / f".0.0.2-external-test.{os.getpid()}.staging"
    owned_staging = []

    def interrupt_copy(source, destination):
      staging = next(path for path in Path(destination).parents if path.name.endswith(".staging"))
      owned_staging.append(staging)
      self.assertNotEqual(staging, legacy)
      self.assertEqual(stat.S_IMODE(staging.stat().st_mode), 0o700)
      # A different actor creates a legacy-looking path after preflight. It
      # must never be mistaken for the private directory owned by this call.
      legacy.mkdir()
      (legacy / "keep.txt").write_text("preserve separately created data\n")
      raise KeyboardInterrupt("synthetic interrupted artifact copy")

    with mock.patch.object(secure.base.shutil, "copyfile", side_effect=interrupt_copy):
      with self.assertRaises(KeyboardInterrupt):
        self._install(self.second)
    self.assertEqual(len(owned_staging), 1)
    self.assertFalse(owned_staging[0].exists())
    self.assertEqual((legacy / "keep.txt").read_text(), "preserve separately created data\n")
    remaining = {path: value for path, value in self._installed_snapshot().items()
                 if not path.startswith(f"releases/{legacy.name}")}
    self.assertEqual(remaining, before)
    self.assertEqual(secure.doctor(self.root)["version"], "0.0.1-external-test")

  def test_artifact_permissions_are_owner_only_and_preserve_owner_execute(self) -> None:
    self.root.mkdir(mode=0o750)
    for fixture, source_mode, installed_mode in (
      (self.first, 0o777, 0o700),
      (self.second, 0o755, 0o700),
      (self.third, 0o6666, 0o600),
    ):
      with self.subTest(source_mode=oct(source_mode)):
        release = secure.base.read_json(fixture[1])
        payload = next(row for row in release["artifacts"] if row["kind"] == "payload")
        source = fixture[0] / payload["path"]
        source.chmod(source_mode)
        self._install(fixture)
        installed = self.root / "releases" / release["version"] / "artifacts" / payload["path"]
        self.assertEqual(stat.S_IMODE(installed.stat().st_mode), installed_mode)
        self.assertEqual(stat.S_IMODE(source.stat().st_mode), source_mode)
        self.assertEqual(stat.S_IMODE(self.root.stat().st_mode), 0o750)
        self.assertEqual(stat.S_IMODE(installed.parents[len(Path(payload["path"]).parts)].stat().st_mode), 0o700)
        self.assertEqual(secure.doctor(self.root)["status"], "pass")

    secure.rollback(self.root, "0.0.1-external-test")
    self.assertEqual(secure.doctor(self.root)["status"], "pass")
    first = secure.base.read_json(self.first[1])
    payload = next(row for row in first["artifacts"] if row["kind"] == "payload")
    installed = self.root / "releases" / first["version"] / "artifacts" / payload["path"]
    installed.chmod(0o777)
    with self.assertRaises(secure.base.PackageError):
      secure.doctor(self.root)
    secure.rollback(self.root, "0.0.2-external-test")
    with self.assertRaises(secure.base.PackageError):
      secure.rollback(self.root, first["version"])
    self.assertEqual(secure.doctor(self.root)["version"], "0.0.2-external-test")

  def test_doctor_and_trust_anchors_reject_substitution_and_artifact_escape(self) -> None:
    self._install(self.first)

    artifact_root = self.root / "releases" / "0.0.1-external-test" / "artifacts"
    outside_artifacts = self.work / "outside-installed-artifacts"
    artifact_root.rename(outside_artifacts)
    artifact_root.symlink_to(outside_artifacts, target_is_directory=True)
    try:
      with self.assertRaises(secure.base.PackageError):
        secure.doctor(self.root)
    finally:
      artifact_root.unlink(missing_ok=True)
      outside_artifacts.rename(artifact_root)
    self.assertEqual(secure.doctor(self.root)["status"], "pass")

    alternate_release_private, alternate_release_public = self._generate_keypair("alternate-release")
    alternate_entitlement_private, alternate_entitlement_public = self._generate_keypair(
      "alternate-entitlement"
    )
    alternate = self._fixture(
      "0.0.5-alternate-external",
      "e",
      release_private=alternate_release_private,
      release_public=alternate_release_public,
      entitlement_private=alternate_entitlement_private,
      entitlement_public=alternate_entitlement_public,
    )
    with self.assertRaises(secure.base.PackageError):
      self._install(
        alternate,
        release_public=alternate_release_public,
        entitlement_public=alternate_entitlement_public,
      )
    self.assertEqual(secure.base.current_state(self.root)["version"], "0.0.1-external-test")

    anchor_key = self.root / secure.ANCHOR_DIR / "release-public-key.pem"
    original_anchor = anchor_key.read_bytes()
    anchor_key.write_bytes(alternate_release_public.read_bytes())
    with self.assertRaises(secure.base.PackageError):
      secure.doctor(self.root)
    anchor_key.write_bytes(original_anchor)
    os.chmod(anchor_key, 0o600)
    self.assertEqual(secure.doctor(self.root)["status"], "pass")

  def test_rollback_and_uninstall_verify_integrity_and_exact_delete_scope(self) -> None:
    self._install(self.first)
    self._install(self.second)
    rollback = secure.rollback(self.root, "0.0.1-external-test")
    self.assertEqual(rollback["version"], "0.0.1-external-test")
    acceptance = secure.acceptance(self.root)
    self.assertEqual(acceptance["acceptance"], "signed_customer_package_mechanics_verified")
    self.assertEqual(acceptance["production_acceptance"], "unknown")

    installed_entitlement = self.root / "releases" / "0.0.1-external-test" / "entitlement.json"
    original_entitlement = secure.base.read_json(installed_entitlement)
    tampered_entitlement = dict(original_entitlement)
    tampered_entitlement["entitlement_id"] = "tampered-after-install"
    secure.base.write_json(installed_entitlement, tampered_entitlement)
    with self.assertRaises(secure.base.PackageError):
      secure.doctor(self.root)
    with self.assertRaises(secure.base.PackageError):
      secure.uninstall(self.root)
    self.assertTrue(self.root.is_dir())
    secure.base.write_json(installed_entitlement, original_entitlement)

    root_sentinel = self.root / "do-not-delete.txt"
    root_sentinel.write_text("outside managed inventory\n", encoding="utf-8")
    with self.assertRaises(secure.base.PackageError):
      secure.uninstall(self.root)
    self.assertTrue(root_sentinel.is_file())
    root_sentinel.unlink()

    anchor_sentinel = self.root / secure.ANCHOR_DIR / "do-not-delete.txt"
    anchor_sentinel.write_text("outside trust-anchor inventory\n", encoding="utf-8")
    with self.assertRaises(secure.base.PackageError):
      secure.uninstall(self.root)
    self.assertTrue(anchor_sentinel.is_file())
    anchor_sentinel.unlink()

    self.assertEqual(secure.doctor(self.root)["status"], "pass")
    result = secure.uninstall(self.root)
    self.assertEqual(result["status"], "uninstalled")
    self.assertFalse(self.root.exists())


if __name__ == "__main__":
  unittest.main()
