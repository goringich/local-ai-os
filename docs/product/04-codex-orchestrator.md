# Codex Orchestrator

Codex is treated as a controlled executor. It receives a work item, a context pack, writable boundaries, required checks, and a required report shape.

## Scope and lifecycle

A work item names the allowed repository/branch, file scope, constraints, verification commands, and rollback expectation. The lifecycle can move through preparation, review, execution, verified, failed, or blocked states.

- Write access is scoped; arbitrary command wandering is not a product feature.
- Verification commands are allowlisted and their outcomes are kept in the run report.
- Queue ownership stays with the orchestrator; Atlas does not become a second worker.

## Run report

The handoff summarizes changed-file categories, checks, blockers, decision, and next exact action. It does not expose raw prompts, responses, or customer source.
