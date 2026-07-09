# LOCAL AI OS technical manual

## Product boundary

LOCAL AI OS is a productized implementation layer for one private Linux workstation. It does not replace the local AI runtime center. The adopted runtime center remains:

- `Ollama` for local model execution and OpenAI-compatible API surfaces.
- `Open WebUI` as the primary local model and RAG UI.
- `OpenClaw` as a guarded assistant/router and Telegram gateway.
- `OpenHarness` for local terminal checks.
- `Obsidian` as the human source of truth.
- `Project Atlas` as read-only operator visibility.

The product site, release manifest, and documentation pipeline package this contour into a sellable and verifiable delivery. They do not create a second always-on runtime.

## Repository surfaces

| Surface | Role |
| --- | --- |
| `src/App.tsx` | Product UI, interactive architecture explorer, release status panel, documentation map, delivery pipeline. |
| `src/styles.css` | Product visual system and responsive layout. |
| `public/release-status.json` | Static release manifest consumed by the UI. |
| `scripts/build-release-status.mjs` | Generates `public/release-status.json` and `docs/release-status.md` from package and CI metadata. |
| `scripts/sync-obsidian-docs.mjs` | Mirrors product docs into Obsidian and tracked local AI docs. |
| `.github/workflows/deploy-pages.yml` | GitHub Pages build/deploy pipeline. |
| `docs/*.md` | Technical product documentation, safe to sync into Obsidian. |

## Runtime data contract

The browser reads `release-status.json` from the deployed site root. Required fields:

```json
{
  "product": "LOCAL AI OS",
  "version": "0.1.0",
  "channel": "production",
  "state": "building",
  "sourceRef": "main",
  "commit": "git-sha",
  "generatedAt": "ISO-8601 or local-dev",
  "deploymentUrl": "https://goringich.github.io/local-ai-os/",
  "workflowUrl": "https://github.com/goringich/local-ai-os/actions",
  "checks": [
    { "name": "offer-contract", "state": "pass", "summary": "..." }
  ]
}
```

Allowed check states are currently free text, but the UI has explicit visual states for `pass`, `passed`, `success`, `fail`, `failed`, `pending`, and `running`.

## Release flow

1. Change product code, docs, scripts, or pipeline.
2. Run `npm run release:status` to refresh local manifest files.
3. Run `npm run check:offer`, `npm run lint`, and `npm run build`.
4. Run `npm run docs:sync` when the local Obsidian vault is available.
5. Push to `main`; GitHub Actions runs QA, builds the manifest, deploys to Pages, and publishes the site.

## Documentation sync

`npm run docs:sync` mirrors these source docs:

- `docs/offer.md`
- `docs/product-technical.md`
- `docs/architecture.md`
- `docs/release-pipeline.md`
- `docs/obsidian-sync.md`
- `docs/release-status.md`

Targets:

- `/home/goringich/Desktop/Obsidian/ИИ/Local AI Operating System/Product/`
- `/home/goringich/system-bootstrap/docs/local-ai-stack/product/`

Canonical architecture notes remain separate. The sync script publishes product documentation; architecture decisions that change the local AI system must still be summarized in the canonical Obsidian architecture note and tracked mirror.

## Security and privacy boundaries

- No raw prompts, full responses, auth files, cookies, tokens, `.env`, SSH keys, VPN credentials, or secret-bearing logs go into the site, release manifest, docs, Atlas exports, or Obsidian product docs.
- Generated release status stores metadata only: package version, ref, commit, workflow URL, deployment URL, and check summaries.
- Obsidian sync copies curated docs only. It does not crawl the vault or runtime directories.
- GUI verification must remain GPU-backed on this machine; CPU/software rendering flags are diagnostics only.

## Acceptance

A release is product-ready when:

- The offer invariants are checked by `scripts/check-offer.mjs`.
- The release manifest is present and visible in the UI.
- The interactive architecture section works on desktop and mobile.
- Documentation source files exist and `docs:sync` can mirror them.
- The GitHub Pages workflow builds from `main`.
- Health-gate caveats are reported separately from product build verification.
