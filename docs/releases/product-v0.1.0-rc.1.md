# LOCAL AI OS product-v0.1.0-rc.1

## Status

Release candidate after PR #1: `Build product release pipeline and technical docs`.

## Merged scope

- Public product page now includes technical depth through `ProductDetails`.
- Public technical architecture documentation was added.
- Product release pipeline documentation was added.
- Documentation invariant check was added.
- `npm run qa` now checks offer and documentation invariants before lint/build/audit.
- Product release gate workflow was added.
- README now presents LOCAL AI OS as a connected product shell.

## Merge evidence

- PR: https://github.com/goringich/local-ai-os/pull/1
- Merge commit: `9b0aafd589880530f6690a8e8d382dd98953e8a4`
- PR QA: product-release-gate / Product QA passed before merge.

## Publish note

This release note commit intentionally triggers the GitHub Pages deploy workflow after the merge, because the public page did not update immediately after PR acceptance.

## Known debt

- Confirm that GitHub Pages is configured to deploy from GitHub Actions, not from a static branch.
- Confirm the live site after the deploy workflow finishes.
- Add a post-release Obsidian update with final Pages status.
