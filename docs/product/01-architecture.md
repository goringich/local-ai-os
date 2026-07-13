# Architecture

The architecture keeps ownership explicit rather than creating another control plane.

## Data and ownership flow

Obsidian holds human-readable decisions and operating memory. Git holds versioned source and public projections. Context packs are generated task inputs. Run reports are generated evidence. Atlas is a read-only view, never a replacement source of truth.

- Source of truth: reviewed notes and tracked source.
- Generated consumers: context packs, reports, telemetry, release status, and Atlas snapshots.
- Public projection: this site and approved proof artifacts only.

## Execution flow

Request → scoped context → allowed work item → bounded write → allowlisted verification → normalized report → owner handoff. Each arrow has a boundary; none is a claim of unattended general autonomy.

- The worker does not decide its own trust boundary.
- A failed check remains evidence, not hidden success.
