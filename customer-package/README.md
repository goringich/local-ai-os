# LOCAL AI OS customer package boundary

This directory defines the public, source-side mechanics of a future customer package. It is not a downloadable complete LOCAL AI OS distribution and it is not production-release evidence.

The package contract covers:

- compatibility classification from explicit machine facts;
- entitlement-to-release binding;
- exact source SHA plus artifact SHA-256 verification;
- mandatory SBOM/equivalent and provenance artifacts;
- production signing evidence requirements without storing private signing keys here;
- bounded versioned install into an explicitly managed target root;
- deterministic package doctor and source-package acceptance;
- rollback only to an already installed verified version;
- uninstall only from a root carrying the LOCAL AI OS ownership marker.

Run the source acceptance path with:

```bash
python3 scripts/customer-package.py selftest
python3 scripts/customer-package.py compatibility --facts tests/fixtures/customer-package/supported-linux.json
```

The selftest creates two synthetic releases in a temporary clean root, verifies their hashes, installs both versions, rolls back to the first version, runs package acceptance and removes the managed root. It also proves that synthetic signature evidence is rejected without an explicit test-only flag and that uninstall refuses an unmanaged directory.

## Truth boundary

A passing selftest means only that the source package mechanics behave as defined. It does not prove production signing, payment, real entitlement issuance, compatibility with an actual customer workstation, installed runtime health, `verified_live`, customer acceptance or commercial readiness.

Production release signing must come from a separate private release authority and produce verifiable detached-signature evidence. Real entitlements must come from the payment/licensing authority. Neither secret belongs in this public repository.
