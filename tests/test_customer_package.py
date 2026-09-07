from __future__ import annotations

import json
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/customer-package.py"
FIXTURES = ROOT / "tests/fixtures/customer-package"


def run_cli(*args: str) -> subprocess.CompletedProcess[str]:
  return subprocess.run(
    ["python3", str(SCRIPT), *args],
    cwd=ROOT,
    text=True,
    capture_output=True,
    check=False,
  )


class CustomerPackageFoundationTests(unittest.TestCase):
  def test_selftest_exercises_fail_closed_lifecycle(self) -> None:
    result = run_cli("selftest")
    self.assertEqual(result.returncode, 0, result.stderr)
    payload = json.loads(result.stdout)
    self.assertEqual(payload["status"], "pass")
    self.assertEqual(payload["acceptance"], "source_package_mechanics_verified")
    self.assertEqual(payload["production_acceptance"], "unknown")
    for key in (
      "low_level_customer_operation_rejected",
      "synthetic_rejected_without_flag",
      "unmanaged_delete_rejected",
      "nonempty_adoption_rejected",
      "symlinked_releases_rejected",
      "unsafe_version_rejected",
      "duplicate_artifact_path_rejected",
      "missing_payload_rejected",
      "unknown_artifact_kind_rejected",
      "ed25519_signature_verified",
      "tampered_signature_rejected",
    ):
      self.assertIs(payload[key], True, key)

  def test_supported_linux_fixture_is_supported(self) -> None:
    result = run_cli(
      "compatibility",
      "--facts",
      str(FIXTURES / "supported-linux.json"),
    )
    self.assertEqual(result.returncode, 0, result.stderr)
    payload = json.loads(result.stdout)
    self.assertEqual(payload["result"], "supported")
    self.assertEqual(payload["blockers"], [])
    self.assertEqual(payload["actions"], [])
    self.assertEqual(payload["runtime_and_live"], "unknown")

  def test_unsupported_platform_fixture_fails_closed(self) -> None:
    result = run_cli(
      "compatibility",
      "--facts",
      str(FIXTURES / "unsupported-platform.json"),
    )
    self.assertEqual(result.returncode, 0, result.stderr)
    payload = json.loads(result.stdout)
    self.assertEqual(payload["result"], "unsupported")
    self.assertIn("unsupported_os", payload["blockers"])
    self.assertEqual(payload["runtime_and_live"], "unknown")

  def test_customer_mutation_command_is_not_exposed_by_source_cli(self) -> None:
    result = run_cli(
      "install",
      "--root",
      "/tmp/should-not-run",
      "--artifacts",
      "/tmp/none",
      "--manifest",
      "/tmp/none",
      "--entitlement",
      "/tmp/none",
    )
    self.assertEqual(result.returncode, 2)
    self.assertIn("source-test-only", result.stderr)


if __name__ == "__main__":
  unittest.main()
