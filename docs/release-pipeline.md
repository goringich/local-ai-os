# LOCAL AI OS release pipeline

LOCAL AI OS is shipped as one product, not as a loose landing page plus private notes.

## Pipeline goal

Every change should produce a visible, verifiable product state:

- source change in git;
- automated checks;
- generated release manifest;
- deployed GitHub Pages build;
- product docs ready to sync into Obsidian.

## Local commands

```bash
npm run release:status
npm run check:offer
npm run lint
npm run build
npm run docs:sync
```

`npm run qa` runs the release status generator, offer check, lint, build, and high-severity npm audit.
## Release train

1. Product decision
   - Create or update an Obsidian decision note.
   - State what changes, what does not change, and which product promise is affected.
2. Product page patch
   - Update `src/App.tsx` and `src/styles.css` only when the public story changes.
   - Preserve the current dark technical visual language unless a deliberate redesign is approved.
3. Technical documentation patch
   - Update `docs/technical-architecture.md`, `docs/product-technical.md`, `docs/architecture.md`, this release pipeline, or README.
   - Keep the public page, repo docs, and Obsidian note aligned.
4. QA gate
   - Run `npm run qa`.
   - The gate includes release manifest generation, offer invariants, documentation invariants, lint, build, and high-severity audit.
5. Release
   - Merge through PR.
   - Create a version tag.
   - Publish GitHub Pages from the built product.
   - Write a short release note with scope, checks, and known debt.
6. Post-release memory
   - Add the final release result and next exact product increment to Obsidian.

## GitHub Pages flow

The workflow `.github/workflows/deploy-pages.yml` runs on:

- push to `main`;
- manual `workflow_dispatch`.

Expected stages:

1. Checkout source.
2. Install dependencies with `npm ci`.
3. Generate release status.
4. Verify offer invariants.
5. Run lint and production build.
6. Upload `dist`.
7. Deploy to GitHub Pages.

## Release manifest

`scripts/build-release-status.mjs` writes:

- `public/release-status.json` for the product UI;
- `docs/release-status.md` for Obsidian sync and human review.

In GitHub Actions it uses:

- `GITHUB_REPOSITORY`
- `GITHUB_SERVER_URL`
- `GITHUB_SHA`
- `GITHUB_REF_NAME`
- `GITHUB_RUN_ID`
- `GITHUB_RUN_ATTEMPT`

Locally it falls back to git metadata and stable `local-dev` generation, so repeated local runs do not churn timestamps.

## Required release evidence

Every release should leave these artifacts:

- PR link or commit SHA.
- QA command output summary.
- Product page changes.
- Documentation changes.
- Known limitations.
- Next exact product increment.

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
- [ ] `docs/product-technical.md` and `docs/architecture.md` still match the implementation story.
- [ ] `npm run qa` passes.
- [ ] `npm run docs:sync` completes when Obsidian or mirror sync is required.
- [ ] PR is merged.
- [ ] Tag/release note is created.
- [ ] Post-release note is written in Obsidian.

## Rollback

GitHub Pages rollback is source-driven: revert the bad commit or push a scoped fix to `main`. The release manifest should always point to the source ref and commit that produced the visible site.

## Non-goals

- No second source of truth outside Obsidian.
- No redesign while the current UI direction is accepted.
- No raw private logs, raw prompts, raw responses, credentials, cookies, environment files, or auth files in the product repository.
- No unrestricted command runner in the public product story.

## Operational caveat

This pipeline proves the static product site and docs path. It does not prove that Hyprland, GPU-backed GUI apps, Ollama, OpenClaw, or Project Atlas are healthy. Machine health remains a separate health-gate concern.
