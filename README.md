# LOCAL AI OS

Standalone commercial site for a private, local-first AI workspace installed on one Linux workstation.

This repository is intentionally independent from personal portfolio and CV projects. It is the public product shell for the wider LOCAL AI OS architecture.

Live product site: [goringich.github.io/local-ai-os](https://goringich.github.io/local-ai-os/)

## Offer

- Pilot: 49,900 ₽
- Diagnostic: 9,900 ₽, fully credited toward the pilot
- Scope: one Linux workstation, up to three projects, five working days
- Delivery: context, routing, Obsidian/RAG memory, monitoring, recovery, acceptance report

## Product shape

LOCAL AI OS is positioned as a productized installation, not a loose consulting session. A release must keep these surfaces aligned:

- public product page;
- technical architecture docs;
- release pipeline docs;
- QA gates;
- Obsidian decision note and post-release memory;
- acceptance report for the operator.

## Technical documentation

- [Technical architecture](./docs/technical-architecture.md)
- [Product technical manual](./docs/product-technical.md)
- [Architecture map](./docs/architecture.md)
- [Release pipeline](./docs/release-pipeline.md)
- [Obsidian sync](./docs/obsidian-sync.md)
- [Growth readiness](./docs/growth-readiness.md)

The public docs describe the product boundary only. Private machine paths, raw logs, prompts, responses, credentials, cookies, auth files, and environment files do not belong in this repository.

## Release pipeline

Normal product flow:

1. Record the product decision in Obsidian.
2. Patch the public page and docs.
3. Run `npm run qa`.
4. Merge through PR.
5. Tag the product release.
6. Publish/update the product page.
7. Record the release result and next product increment in Obsidian.

Release tags use the `product-v*` pattern, for example:

```bash
git tag product-v0.1.0
git push origin product-v0.1.0
```

## Development

```bash
npm install
npm run release:status
npm run dev
npm run qa
npm run docs:sync
```

`npm run qa` checks:

- release manifest generation;
- offer invariants;
- documentation invariants;
- lint;
- TypeScript/Vite build;
- high-severity npm audit.

## Product System

- Product UI: interactive architecture map, current release panel, technical layers, documentation map, delivery pipeline and acceptance evidence.
- Release status: `scripts/build-release-status.mjs` generates `public/release-status.json` for the deployed UI and `docs/release-status.md` for documentation sync.
- Documentation: `docs/technical-architecture.md`, `docs/product-technical.md`, `docs/architecture.md`, `docs/release-pipeline.md`, and `docs/obsidian-sync.md`.
- Obsidian sync: `npm run docs:sync` mirrors curated docs into `Desktop/Obsidian/ИИ/Local AI Operating System/Product/` and `system-bootstrap/docs/local-ai-stack/product/`.
- Deploy: `.github/workflows/deploy-pages.yml` verifies, builds and deploys GitHub Pages on `main`.

## Contacts

- Telegram: [@a1gorithms](https://t.me/a1gorithms)
- Email: actingsv@gmail.com
