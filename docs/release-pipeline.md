# LOCAL AI OS release pipeline

LOCAL AI OS is shipped as one product, not as a loose landing page plus private notes.

## Release train

1. Product decision
   - Create or update an Obsidian decision note.
   - State what changes, what does not change, and which product promise is affected.
2. Product page patch
   - Update `src/App.tsx` and `src/styles.css` only when the public story changes.
   - Preserve the current dark technical visual language unless a deliberate redesign is approved.
3. Technical documentation patch
   - Update `docs/technical-architecture.md`, this release pipeline, or README.
   - Keep the public page, repo docs, and Obsidian note aligned.
4. QA gate
   - Run `npm run qa`.
   - The gate includes offer invariants, documentation invariants, lint, build, and high-severity audit.
5. Release
   - Merge through PR.
   - Create a version tag.
   - Publish GitHub Pages from the built product.
   - Write a short release note with scope, checks, and known debt.
6. Post-release memory
   - Add the final release result and next exact product increment to Obsidian.

## Required release evidence

Every release should leave these artifacts:

- PR link or commit SHA.
- QA command output summary.
- Product page changes.
- Documentation changes.
- Known limitations.
- Next exact product increment.

## Non-goals

- No second source of truth outside Obsidian.
- No redesign while the current UI direction is accepted.
- No raw private logs, raw prompts, raw responses, credentials, cookies, environment files, or auth files in the product repository.
- No unrestricted command runner in the public product story.

## Versioning

Use lightweight product tags:

```bash
git tag product-v0.1.0
git push origin product-v0.1.0
```

For pre-release work, use:

```bash
git tag product-v0.1.0-rc.1
git push origin product-v0.1.0-rc.1
```

## Release checklist

- [ ] Obsidian decision note updated.
- [ ] README updated when positioning or delivery scope changes.
- [ ] Public page updated when offer, proof, or product story changes.
- [ ] `docs/technical-architecture.md` still matches the implementation story.
- [ ] `npm run qa` passes.
- [ ] PR is merged.
- [ ] Tag/release note is created.
- [ ] Post-release note is written in Obsidian.
