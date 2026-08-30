# LOCAL AI OS customer package boundary

This directory defines the public, source-side mechanics of a future customer package. It is not a downloadable complete LOCAL AI OS distribution and it is not production-release evidence.

The official package path covers:

- compatibility classification from explicit machine facts;
- signed entitlement-to-release binding;
- exact source SHA plus artifact SHA-256 verification;
- mandatory SBOM/equivalent and provenance artifacts;
- detached Ed25519 verification for both release and entitlement against independently supplied trusted public keys;
- public-key fingerprint binding through `sha256:<public-key-file-sha256>` key IDs;
- first-install pinning of separate release and entitlement public-key trust anchors in the managed root;
- fail-closed rejection of silent signing-key substitution on later installs; key rotation requires a separate explicit migration rather than becoming an install side effect;
- bounded versioned install into an explicitly managed target root;
- transactional secure install recovery: if trust persistence or post-install verification fails, the previous `current.json` is restored and the failed release payload is removed;
- deterministic package doctor that re-verifies installed release and entitlement signatures against the pinned managed-root trust anchors;
- rollback only to an already installed version whose artifacts, release signature and active signed entitlement still verify, with pointer restoration if post-switch verification fails;
- uninstall only from a root carrying the LOCAL AI OS ownership marker.

The customer-facing entrypoint is:

```bash
python3 scripts/customer-package-secure.py compatibility --facts tests/fixtures/customer-package/supported-linux.json
python3 scripts/customer-package-secure.py verify --artifacts <dir> --manifest <release.json> --entitlement <entitlement.json> --release-public-key <release-public-key.pem> --entitlement-signatures <dir> --entitlement-public-key <entitlement-public-key.pem>
python3 scripts/customer-package-secure.py install --root <managed-root> --artifacts <dir> --manifest <release.json> --entitlement <entitlement.json> --release-public-key <release-public-key.pem> --entitlement-signatures <dir> --entitlement-public-key <entitlement-public-key.pem>
python3 scripts/customer-package-secure.py doctor --root <managed-root>
```

`customer-package.py` remains the low-level deterministic source harness used by tests. Its synthetic-signature mode is not the official verify/install interface. The official CLI has no synthetic-signature bypass.

Run source acceptance with:

```bash
python3 scripts/customer-package.py selftest
python3 scripts/customer-package-secure.py selftest
```

The secure selftest creates separate ephemeral Ed25519 release and entitlement authorities, signs multiple synthetic versions, verifies both trust chains, installs and updates versions, rejects a different signing authority after trust anchors are pinned, injects a trust-persistence failure and verifies transactional recovery, rolls back to the first version, verifies package acceptance, rejects a structurally valid but forged entitlement, rejects unsigned/synthetic release evidence on the official path, detects entitlement and trust-anchor tampering, and removes the managed root.

## Truth boundary

A passing selftest means only that the source package mechanics behave as defined. It does not prove production key authority, a secure real-world key-rotation ceremony, resistance to an attacker who can rewrite every file in the customer-managed root, payment, real entitlement issuance, compatibility with an actual customer workstation, installed runtime health, `verified_live`, customer acceptance or commercial readiness.

Production release and entitlement signing must come from private authorities outside this public repository. Only public verification material crosses into the customer package. Payment/provider secrets and signing private keys never belong in the public repository or customer evidence.
