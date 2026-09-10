from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest


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
