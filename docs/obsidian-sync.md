# LOCAL AI OS Obsidian sync

## Source of truth

Product documentation is authored in this repository under `docs/`. Obsidian receives a mirrored copy for daily operator use and RAG retrieval.

Canonical local AI architecture remains in the operator's existing architecture and control-center notes, with their existing tracked mirror. Their locations belong in the private deployment handoff, outside this public repository.

The sync script does not discover a vault or choose private note paths.

## Sync command

```bash
npm run docs:sync
```

Dry run:

```bash
OBSIDIAN_SYNC_DRY_RUN=1 npm run docs:sync
```

## Targets

Configure these absolute paths in your local shell or private deployment configuration before running either command:

- `PRODUCT_OBSIDIAN_DIR`: a dedicated product-docs folder in the approved Obsidian vault.
- `PRODUCT_DOCS_MIRROR_DIR`: a dedicated product-docs folder in the approved tracked mirror.

Both are required. Missing, relative, identical, or overlapping destinations fail before any write. Use dedicated folders because selected filenames are overwritten by the curated copies.

Directory aliases are resolved for separation checks. Existing output symlinks, hardlinks, and non-file entries are rejected. Canonical notes must remain outside the sync destinations and source checkout.

Optional `PRODUCT_ARCHITECTURE_NOTE` and `PRODUCT_ARCHITECTURE_MIRROR` identify existing canonical notes for the established productization section update. If omitted, canonical notes are untouched. Missing files are not created. Architecture decisions still require a separate factual update in the canonical architecture and control-center notes.

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
