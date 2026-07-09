# LOCAL AI OS technical architecture

This document describes the public product architecture. It intentionally avoids private paths, credentials, raw logs, and raw conversations.

## Product promise

LOCAL AI OS installs a private local-first AI workspace on one Linux workstation. The delivery connects project context, model routing, Obsidian/RAG memory, monitoring, recovery, and acceptance evidence into one maintainable contour.

## Layers

| Layer | Product role | Typical implementation |
| --- | --- | --- |
| Source of truth | Durable human-readable architecture and decisions | Obsidian notes plus GitHub repositories |
| Context layer | Bounded task context instead of repeated full-history reads | context inventory, context packs, source notes, repo summaries |
| Retrieval layer | Searchable memory for project and system knowledge | Obsidian/RAG, hybrid search when available, knowledge graph |
| Model layer | Role-based local model usage | Ollama-compatible local models and role map |
| Runtime layer | Local user-facing AI surfaces | Open WebUI, OpenClaw, OpenHarness-style terminal checks |
| Execution layer | Governed code/system work | Codex foreground runs, queue, run reports |
| Observability layer | Operator state without raw private data | Project Atlas, status snapshots, telemetry summaries |
| Recovery layer | Restore and rollback route | backups, restore dry-run, bootstrap notes |
| Release layer | Productized delivery | docs, QA gates, tags, release notes |

## Default delivery scope

- One Linux workstation.
- Up to three active projects.
- Five working days for the pilot.
- Diagnostic phase credited toward the pilot.
- No migration to a new always-on runtime unless evidence shows the existing center is insufficient.

## Delivery artifacts

A pilot should produce:

- architecture map;
- technical runbook;
- context and retrieval policy;
- model routing map;
- monitoring/status surface;
- restore checklist and dry-run result;
- release checklist;
- acceptance report;
- known-debt list;
- next exact product increment.

## Safety boundary

The product must not store or publish:

- raw prompts or raw responses;
- full private transcripts;
- secret values;
- authentication files;
- cookies;
- SSH keys;
- VPN/proxy credentials;
- environment files;
- unrestricted shell bridges.

## Operator flow

```text
request
  -> source-of-truth lookup
  -> context pack
  -> model/runtime route
  -> bounded execution or dry-run
  -> verification
  -> normalized report
  -> Atlas/Obsidian handoff
  -> release or next action
```

## Release integration

The product repository contains the public page and public technical docs. Obsidian remains the human source of truth for decisions, current state, and post-release memory.

Every release must align these surfaces:

- product page;
- README;
- technical docs;
- release pipeline docs;
- Obsidian decision note.
