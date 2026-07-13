# Security

Security begins with data classification and least privilege, not a claim that all agent work is safe by default.

## Public and private boundary

Public artifacts may contain reviewed architecture, aggregate proof measurements, changed-file categories, verification summaries, and release metadata. They never contain private paths, raw prompts or responses, credentials, logs, PII, customer code, or unapproved repository names.

- Secrets stay in local secret stores or owner-approved deployment mechanisms.
- Redaction happens before public proof generation.
- Permissions define readable sources, writable roots, commands, and operators.

## Audit and failure

Run reports and verification evidence provide an audit-friendly summary. They do not replace host security monitoring. Any uncertain publication is withheld.
