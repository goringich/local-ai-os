from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
SECURE_PATH = REPO_ROOT / "scripts" / "customer-package-secure.py"
SPEC = importlib.util.spec_from_file_location("local_ai_os_customer_package_secure_test", SECURE_PATH)
if SPEC is None or SPEC.loader is None:
  raise RuntimeError("cannot load secure customer package module")
secure = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(secure)


class SecureCustomerPackageLifecycleTest(unittest.TestCase):
  def setUp(self) -> None:
    self.temp = tempfile.TemporaryDirectory()
    self.work = Path(self.temp.name)
    self.root = self.work / "managed"
    self.release_private, self.release_public = secure._generate_keypair(self.work, "release")
    self.entitlement_private, self.entitlement_public = secure._generate_keypair(
      self.work,
      "entitlement",
    )
    self.first = self._fixture("0.0.1-external-test", "a")
    self.second = self._fixture("0.0.2-external-test", "b")
    self.third = self._fixture("0.0.3-external-test", "c")

  def tearDown(self) -> None:
    self.temp.cleanup()

  def _fixture(self, version: str, source_char: str):
    return secure.signed_fixture(
      self.work,
      version,
      source_char,
      self.release_private,
      self.release_public,
      self.entitlement_private,
      self.entitlement_public,
    )

  def _install(self, fixture):
    return secure.install(
      self.root,
      fixture[0],
      fixture[1],
      fixture[2],
      self.release_public,
      fixture[3],
      self.entitlement_public,
    )

  def test_lifecycle_lock_rejects_overlapping_mutations_without_state_change(self) -> None:
    self._install(self.first)
    self._install(self.second)

    with secure._lifecycle_lock(self.root):
      with self.assertRaises(secure.base.PackageError):
        self._install(self.third)
      with self.assertRaises(secure.base.PackageError):
        secure.rollback(self.root, "0.0.1-external-test")
      with self.assertRaises(secure.base.PackageError):
        secure.uninstall(self.root)

    self.assertEqual(secure.base.current_state(self.root)["version"], "0.0.2-external-test")
    self.assertFalse((self.root / "releases" / "0.0.3-external-test").exists())
    self.assertEqual(secure.doctor(self.root)["status"], "pass")

  def test_uninstall_rejects_unexpected_content_before_recursive_delete(self) -> None:
    self._install(self.first)

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

  def test_doctor_rejects_symlinked_installed_artifact_root(self) -> None:
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


if __name__ == "__main__":
  unittest.main()
