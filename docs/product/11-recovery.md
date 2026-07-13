# Recovery

Recovery is a source-driven route: preserve data, know ownership, test restore, and keep rollback separate from a live incident workaround.

## Backup and rollback

Each implementation documents what is backed up, who can restore it, the order of recovery, and a restore dry-run. A bad product-site release is rolled back by reverting or fixing the versioned source and redeploying.

- Backups do not imply publication of their contents.
- Recovery instructions do not include secrets in public documentation.
- GUI workarounds that force software rendering are incident diagnostics, not accepted final states.
