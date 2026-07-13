# LOCAL AI OS

Proof-first public product surface for a private Linux/Codex workflow: bounded context, scoped execution, verification, and a sanitized report the owner can assess.

Live site: [goringich.github.io/local-ai-os](https://goringich.github.io/local-ai-os/)

## Start here

- `/` is the proof-first acquisition page: one failure mode, one controlled workflow, an honest founder proof, and the proof-cohort CTA.
- `/proofs` and `/proofs/<proof-id>` are shareable, public-safe evidence artifacts.
- `/product`, `/architecture`, `/runtime`, `/context-memory`, `/codex-orchestrator`, `/project-atlas`, `/integrations`, `/security`, `/deployment`, `/acceptance`, `/operations`, `/recovery`, `/releases`, `/roadmap`, `/docs`, and `/faq` are the technical due-diligence portal.

Every route is emitted as a static `index.html` route artifact during the Vite build, so direct GitHub Pages refreshes work without a server-side router.

## Public repository versus delivery

This repository is a public product surface, not the complete LOCAL AI OS installation.

Publicly inspectable/downloadable:

- the Vite/React product site and GitHub Pages deployment configuration;
- technical portal Markdown in `docs/product/` and its generated typed snapshot;
- proof contract, proof cohort terms, public-safe founder proof data, and QA checks;
- release status generator and static build route generation.

Provided only during an owner-approved implementation:

- workstation-specific runtime/component topology, model routing, ports, and dependency choices;
- scoped customer configuration, writable boundaries, integration decisions, and acceptance report;
- recovery plan and handoff tailored to the agreed scope.

Never public: customer source, private paths, prompts, responses, credentials, cookies, secret values, runtime logs, PII, or unapproved repository names.

## Status and commercial boundary

The pilot remains a bounded implementation for one Linux workstation, up to three projects, over five working days. Diagnostic: 9,900 ₽, credited toward a 49,900 ₽ pilot. The product does not promise universal autonomy or an unrestricted shell bridge.

The founder proof is not a customer case. Its metrics are aggregates from a sanitized telemetry rollup; fields without a recorded matched baseline are intentionally `unavailable`.

## Documentation system

`docs/product/` is a reviewed public projection. Obsidian remains the human-readable source of truth for the installed system. `scripts/build-product-docs.mjs` produces `src/product-docs/productDocs.ts`; QA fails if the generated snapshot drifts from the reviewed Markdown.

- [Proof contract](./docs/proof-contract.md)
- [Proof cohort](./docs/proof-cohort.md)
- [Technical architecture](./docs/technical-architecture.md)
- [Product technical manual](./docs/product-technical.md)
- [Release pipeline](./docs/release-pipeline.md)

## Development and verification

```bash
npm install
npm run docs:build
npm run check:proofs
npm run qa
```

`npm run qa` generates release/docs data, validates offer/docs/proofs, lints, builds production assets, confirms direct static routes, and runs the high-severity npm audit. `npm run docs:sync` mirrors curated product docs into the existing Obsidian/tracked-mirror flow; it is not a vault export.

## Release flow

1. Record the product decision in Obsidian.
2. Update source docs/proof data and rebuild generated data.
3. Run `npm run qa`.
4. Review the public/private boundary and production route artifacts.
5. Merge through PR, deploy GitHub Pages, then record release outcome and limits.
