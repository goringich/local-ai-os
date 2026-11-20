# LOCAL AI OS — system architecture inventory (public-safe)

**Scope:** audited Git source and documented architecture, not a current live-host snapshot. **Updated:** 2026-11-20.

## One system, several distinct authorities

The private System comprises core control/retrieval/governance in \`private System control repository\`, bounded worker queue in \`private bounded executor repository\`, supporting \`system-bootstrap\`, Project Atlas's UI role in \`home-admin\`, and human memory in Obsidian. The public \`local-ai-os\` product site/release source is **outside the strict runtime core**. Other customer/product repositories are not silently included merely because they are accessible.

## Three planes

1. **Control:** owner intent → bounded mission → immutable plan version → task/attempt identity → allowed dispatch with leases/timeouts.
2. **Data/context:** canonical Git + reviewed Obsidian → provenance/freshness/scope evaluation → contextual retrieval → budgeted pack; generated indices never override authoritative source.
3. **Evidence/outcome:** tests + exact source revision + independent verifier → optional separately gated merge/deploy → observed runtime/customer result → accepted learning.

A passing test does not imply a merged, installed, deployed or customer-accepted result.

## All eleven architecture layers

- **L0 Personal OS:** local Linux host, restore and portability.
- **L1 Human knowledge:** reviewed decisions, architectural intent, incident and procedure notes.
- **L2 Operator Status:** bounded metadata, current blockers and next action.
- **L3 Project Atlas:** sanitized human-facing overview; not a second mission or mutation authority.
- **L4 Context / CAG / RAG:** source discovery, safe retrieval, hybrid search, authority/freshness checks and context compilation.
- **L5 Mission / Portfolio:** SQLite Mission Ledger, objectives, versioned plans, DAGs, task/attempt history.
- **L6 Governed Entry:** local-agent-run prepares scoped execution and evidence requirements.
- **L7 Executors / Models:** codex-orchestrator queue/claim/lease; routed workers and role-specific model choices.
- **L8 Verification / Economy:** evidence, independent QA, costs per accepted outcome, owner effort.
- **L9 Integrations / Portability:** source sync, product-owned boundaries, approved remote adapters.
- **L10 Restricted Runtime:** local database files, queues, private bindings, model weights, secret stores and raw logs that are not portable/public source.

These layers are conceptual responsibilities, not a claim of eleven running microservices.

## Memory and knowledge

- Conversation Continuity: structured checkpoints and token-bounded continuation; not raw transcript injection.
- Memory Control Plane: routes across episodic, semantic, procedural, graph, architecture and opt-in forensic lanes.
- RAG v3: local Qdrant index, independent dense/sparse retrieval, RRF, pre-read and pre-retrieval scope filtering, source/line hashes, freshness and ranking.
- Solution/Experience Memory: reusable **verified** procedures and failures; cannot override fresh code or live evidence.
- Project Mental Model: derived WHY/WHAT/REALITY/QUALITY/GAPS/DELIVERY/EVIDENCE snapshot.
- Project Reality Graph: source, symbol, UI, API, data, tests, journeys and bounded runtime traces.
- Unified Intelligence Graph: read-only exploration of architecture/knowledge/project/runtime relationships, not a second authority.

## Mission and attempt model

\`mission_id → plan_version → workstream_id → task_id → attempt_id → run_id → source SHA/artifacts → verification → delivery → observed outcome\`.

Retry generates a new attempt, **not** a duplicate logical task. Terminal attempt states: \`completed | failed | blocked | canceled | expired | superseded\`. Work, implementation, deployment and outcome are independent axes.

## Governed execution and fail-closed security

A real task must resolve ownership, permissible roots, budget, scope, context digest, allowed command identifiers, timeout, approver and required evidence. The queue worker can run allowed execution; it cannot grant itself production, payment, publication or secret access. Reviewer and executor roles should be separated. Browser/UI and sanitized project graph never become unrestricted command API.

## QA and claims ladder

\`documented → source-present → tested-exact-commit → merged → installed → running → live scenario verified → customer outcome → commercial outcome\`.

This page confirms relevant code and contracts have been inspected in Git, **not** that every integration passed its live gate. Experimental and planned components remain classified separately. Runtime source parity, real restore, customer proof and autonomous completion need current live/independent evidence.

## Implementation and commercial boundaries

Current offer: one Linux workstation, up to three projects, five working days, 9 900 ₽ diagnostic credited to 49 900 ₽ pilot. The public site is not the client installer. Customer-specific topology, secrets, entitlement and signed release must be handled in a private, approved customer lifecycle, not published in GitHub Pages.

## Primary source links

- Product public repository: https://github.com/goringich/local-ai-os
- Product description: https://github.com/goringich/local-ai-os/blob/main/docs/technical-architecture.md
- Product terms: https://github.com/goringich/local-ai-os/blob/main/docs/offer.md
- Customer proof contract: https://github.com/goringich/local-ai-os/blob/main/docs/proof-contract.md
- System control source (private, access-controlled): \`private System control repository\`.
- Queue worker source (private, access-controlled): \`private bounded executor repository\`.
- Atlas code (private, access-controlled): \`private Project Atlas implementation\`.

Do not publish machine-local paths, customer-specific repository names, credentials, raw prompts/responses or private telemetry for architectural decoration.
