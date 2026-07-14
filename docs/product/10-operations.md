# Operations

Operations make current state inspectable without turning runtime exports into a second source of truth.

## Health and routine work

Operators use bounded health checks, queue state, freshness, release status, and recent normalized reports. A degraded signal is investigated from its incident evidence instead of being presented as healthy.

- Routine maintenance uses documented checks and known owners.
- Runtime state remains local and sanitized before any aggregate visibility.
- Model routing and service state are refreshed when the task requires them.

## Status

The operational model is experimental at product level because the exact services are implementation-specific.

## Desktop operator entry

AI System Navigator is an allowlisted menu inside the existing launcher. It stores only a sanitized enabled/disabled preference. Arbitrary action identifiers are denied, raw prompts and responses are not written to tracked product files, and status continues to come from the existing control plane.
