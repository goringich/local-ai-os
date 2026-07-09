# LOCAL AI OS Obsidian sync

## Source of truth

Product documentation is authored in this repository under `docs/`. Obsidian receives a mirrored copy for daily operator use and RAG retrieval.

Canonical local AI architecture remains in:

- `/home/goringich/Desktop/Obsidian/ИИ/AI система на этом ПК — полная архитектура 2026-04-24.md`
- `/home/goringich/Desktop/Obsidian/ИИ/Local AI Control Center.md`
- `/home/goringich/system-bootstrap/docs/local-ai-stack/notes/ai-system-architecture-2026-04-24.md`

## Sync command

```bash
npm run docs:sync
```

Dry run:

```bash
OBSIDIAN_SYNC_DRY_RUN=1 npm run docs:sync
```

## Targets

The sync script writes to:

- `/home/goringich/Desktop/Obsidian/ИИ/Local AI Operating System/Product/`
- `/home/goringich/system-bootstrap/docs/local-ai-stack/product/`

It also writes a generated `README.md` index in both targets.

## Files copied

- `docs/offer.md`
- `docs/product-technical.md`
- `docs/architecture.md`
- `docs/release-pipeline.md`
- `docs/obsidian-sync.md`
- `docs/release-status.md`

## Update rule

When product docs change, update the repo docs first and run `npm run docs:sync`. When architecture, runtime contracts, telemetry, routing, RAG, or agent-runtime decisions change, add an ADR-style summary to the canonical Obsidian architecture note and tracked mirror in the same task.

## Safety rule

The sync script only copies curated docs. It does not export raw prompts, transcripts, auth state, environment files, cookies, tokens, SSH keys, VPN/proxy credentials, or runtime logs.
