# Context and memory

The purpose of context engineering is to stop an agent from replaying an entire workstation or conversation when one task needs a bounded brief.

## Context packs

A context pack selects reviewed notes, repository facts, task scope, freshness metadata, and verification commands. It records provenance and token budget so an owner can understand why a source was included.

- Canonical notes outrank generated summaries.
- Raw conversation mirrors, secrets, and generated clutter are excluded from normal packs.
- A stale or denied source is visible in the report.

## Freshness and provenance

RAG is a retrieval layer, not a second memory. Each installation defines eligible sources, freshness expectations, redaction rules, and budget limits before enabling a workflow.

## User-first entry and measured quality

The optional AI System Navigator exposes Smart Context and Find Knowledge inside the existing Hyprland `Super+D` launcher. Smart Context uses the existing Codex context entrypoint with a micro budget; Find Knowledge returns bounded snippets and source paths instead of a vault dump.

On the verified 2026-07-15 fixture set, shared source-authority scoring moved end-to-end retrieval from hit@1 `0.6667` and MRR `0.8241` to hit@1 `1.0` and MRR `1.0`, while hit@3 remained `1.0`. Governed historical context packs contain a best observed ratio of `0.0862` (about `11.6x` reduction). These are local engineering measurements, not customer proof or a guarantee for every task.
