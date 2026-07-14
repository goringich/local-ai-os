# Project Atlas

Project Atlas is an operator lens over sanitized, generated state: queues, current reports, status, freshness, and next actions.

## Read-only visibility

Atlas can show a report and guide an operator to a governed enqueue route, but it does not own the task queue, canonical decisions, or arbitrary command execution.

- Shows evidence and state, not hidden control.
- Reads normalized status rather than raw credentials or conversation logs.
- Health is time-sensitive and must be refreshed at operation time.

## Status

The visibility model is stable. Individual Atlas widgets and integration endpoints remain experimental installation details.
