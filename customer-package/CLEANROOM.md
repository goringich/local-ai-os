# Customer package clean-room acceptance

This check proves the current customer-package lifecycle in an isolated Linux container using synthetic customer data and production-shaped Ed25519-signed release/entitlement artifacts.

## Local run

From the repository root:

```sh
bash scripts/test-customer-package-cleanroom.sh
```

The wrapper selects Docker first and Podman second. Override with `CONTAINER_ENGINE=podman` or `CONTAINER_ENGINE=docker`.

The default image is `python:3.12-bookworm`. If it is not already present, the wrapper pulls it **before** entering the isolated test. Override it with `LOCAL_AI_OS_CLEANROOM_IMAGE=<image>` when an approved local image is required.

During the actual acceptance run the container has:

- `--network none`;
- a read-only root filesystem;
- all Linux capabilities dropped;
- `no-new-privileges`;
- no Docker/Podman socket;
- no host home directory;
- only `customer-package.py`, `customer-package-secure.py`, and the clean-room test mounted read-only;
- disposable tmpfs work and temp directories;
- synthetic project data only.

A normal developer workstation may run the wrapper directly through Docker or Podman. The owner's trusted System GitHub runner is deliberately different: it must not receive host-Docker authority. On that runner this same Python acceptance is executed only after the exact candidate source is transported as data into the existing rootless CI broker. The broker boundary, not direct Docker access from the runner, is authoritative for System-triggered local evidence.

## Covered cycle

The test creates test-only issuer keys outside the customer bundle, builds two production-shaped releases, signs the release manifests and entitlements, archives them, copies and hash-checks them as a download equivalent, then exercises the real customer CLI:

```text
compatibility
-> verify signed release + entitlement
-> install 0.1.0
-> doctor
-> execute installed deterministic runtime probe
-> fresh-process doctor + runtime probe
-> package acceptance
-> verify/install 0.2.0 update
-> execute updated payload
-> rollback to 0.1.0
-> execute rolled-back payload
-> tamper installed payload and require doctor to fail closed
-> restore exact payload
-> doctor
-> guarded uninstall
```

The customer archives are also checked to ensure private signing keys are not present.

## Truth boundary

A green result proves the customer package and lifecycle mechanics under this clean-room model. It also proves that an installed payload can execute against a synthetic project, persist its result, survive a fresh process, update and roll back.

It does **not** prove:

- a real LLM or coding agent works in the customer environment;
- production signing-key authority;
- production entitlement/payment issuance;
- customer-specific integrations;
- real customer acceptance or business value.

Those remain separate acceptance layers and must not be inferred from this test.
