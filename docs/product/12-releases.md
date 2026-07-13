# Releases

The release train ties source change, QA, generated public data, Pages build, and post-release memory together.

## Release gates

The public site generates release status, validates documentation and proof data, lints TypeScript, builds production assets, validates direct routes, and runs a high-severity dependency audit.

- Generated documentation must match its reviewed Markdown source.
- Proof pages must pass schema, forbidden-content, and verification-evidence checks.
- A release note records known limits rather than inventing success metrics.
