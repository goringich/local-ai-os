# LOCAL AI OS customer package boundary

This directory defines the public, source-side mechanics of a future customer package. It is not a downloadable complete LOCAL AI OS distribution and it is not production-release evidence.

The official package path covers:

- compatibility classification from explicit machine facts;
- signed entitlement-to-release binding;
- exact source SHA plus artifact SHA-256 verification;
- a strict release inventory with unique artifact paths and distinct required `payload`, `sbom`, and `provenance` kinds; unknown kinds and path reuse are rejected;
- detached Ed25519 verification for both release and entitlement against independently supplied trusted public keys;
- public-key fingerprint binding through `sha256:<public-key-file-sha256>` key IDs;
- first-install pinning of separate release and entitlement public-key trust anchors in the managed root;
- fail-closed rejection of silent signing-key substitution on later installs; key rotation requires a separate explicit migration rather than becoming an install side effect;
- bounded versioned install into a new target, an empty unmanaged target, or an already complete managed root;
- rejection of marker-only or otherwise incomplete pre-existing managed roots: the ownership marker by itself is not enough to adopt a directory, and an existing managed root must have a valid current pointer and real trust anchors;
- transactional secure install recovery: if trust persistence or post-install verification fails, the previous `current.json` is restored, failed release material is removed, and a failed first bootstrap restores the target to its pre-install state;
- deterministic package doctor that re-verifies installed release and entitlement signatures against the pinned managed-root trust anchors and rechecks the installed inventory;
- rollback only to an already installed version whose artifacts, release signature and active signed entitlement still verify, with pointer restoration if post-switch verification fails;
- secure uninstall only after the current package passes the full signed `doctor` path; a marker alone cannot authorize recursive deletion, and a tampered package is not silently removed.

The customer-facing entrypoint is:

```bash
python3 scripts/customer-package-secure.py compatibility --facts tests/fixtures/customer-package/supported-linux.json
python3 scripts/customer-package-secure.py verify --artifacts <dir> --manifest <release.json> --entitlement <entitlement.json> --release-public-key <release-public-key.pem> --entitlement-signatures <dir> --entitlement-public-key <entitlement-public-key.pem>
python3 scripts/customer-package-secure.py install --root <managed-root> --artifacts <dir> --manifest <release.json> --entitlement <entitlement.json> --release-public-key <release-public-key.pem> --entitlement-signatures <dir> --entitlement-public-key <entitlement-public-key.pem>
python3 scripts/customer-package-secure.py doctor --root <managed-root>
python3 scripts/customer-package-secure.py uninstall --root <managed-root>
```

`customer-package.py` remains the low-level deterministic source harness used by tests. It is not a customer lifecycle interface. Customer verify/install/doctor/acceptance/rollback/uninstall operations belong to `customer-package-secure.py`, and the official path exposes no synthetic-signature bypass.

Run source acceptance with:

```bash
python3 scripts/customer-package.py selftest
python3 scripts/customer-package-secure.py selftest
```

The source tests reject duplicate artifact paths, missing required payload/SBOM/provenance kinds and unknown artifact kinds. The secure selftest creates separate ephemeral Ed25519 release and entitlement authorities, signs multiple synthetic versions, verifies both trust chains, rejects marker-only root adoption, installs and updates versions, rejects a different signing authority after trust anchors are pinned, injects a trust-persistence failure and verifies transactional recovery, rolls back to the first version, verifies package acceptance, rejects a structurally valid but forged entitlement, rejects unsigned/synthetic release evidence on the official path, detects entitlement and trust-anchor tampering, refuses secure uninstall while trust verification is broken, and removes the managed root only after full verification is restored.

## Truth boundary

A passing selftest means only that the source package mechanics behave as defined. It does not prove the semantic correctness of a real SBOM/provenance statement, production key authority, a secure real-world key-rotation ceremony, resistance to an attacker who can rewrite every file in the customer-managed root, payment, real entitlement issuance or revocation, compatibility with an actual customer workstation, installed runtime health, `verified_live`, customer acceptance or commercial readiness.

Production release and entitlement signing must come from private authorities outside this public repository. Only public verification material crosses into the customer package. Payment/provider secrets and signing private keys never belong in the public repository or customer evidence.
