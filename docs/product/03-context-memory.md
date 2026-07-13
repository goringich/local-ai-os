# Context and memory

The purpose of context engineering is to stop an agent from replaying an entire workstation or conversation when one task needs a bounded brief.

## Context packs

A context pack selects reviewed notes, repository facts, task scope, freshness metadata, and verification commands. It records provenance and token budget so an owner can understand why a source was included.

- Canonical notes outrank generated summaries.
- Raw conversation mirrors, secrets, and generated clutter are excluded from normal packs.
- A stale or denied source is visible in the report.

## Freshness and provenance

RAG is a retrieval layer, not a second memory. Each installation defines eligible sources, freshness expectations, redaction rules, and budget limits before enabling a workflow.
