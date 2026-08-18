# LOCAL AI OS product film

The product film is founder-led proof content for the proof-first growth loop in issue #6. It is designed to explain one controlled workflow in about 25 seconds rather than advertise the complete architecture.

## Story

The film uses the same public product promise as the acquisition page:

1. reduce irrelevant context rather than maximize context;
2. select a bounded working set;
3. restrict writable scope;
4. run required verification;
5. leave a compact evidence-backed handoff;
6. invite one workflow into the proof cohort.

The deployed site contains an interactive motion version through `src/PromoFilm.tsx`. Shareable MP4 masters are deterministic generated artifacts, not tracked source.

## Evidence boundary

All numeric advertising claims are bound to `public/proofs/founder-context-control-001.json` through `public/promo/local-ai-os-promo.json` and `scripts/check-promo.mjs`.

Current public-safe founder proof claims:

- 12 verified runs;
- 17 context-preflight runs;
- 158,460 recorded input-context characters.

The film must not claim a speed, token, quality, conversion or productivity improvement percentage because no matched before/after baseline was recorded. The founder proof must not be presented as a customer result.

No customer source, private repository name, prompt, response, private path, credential, PII or raw runtime log belongs in the film or its generated outputs.

## Render

The renderer uses local deterministic drawing plus `ffmpeg`; no external visual-generation provider is required.

Runtime dependencies:

```bash
python -m pip install pillow numpy qrcode
ffmpeg -version
```

Render both approved masters:

```bash
npm run promo:check
npm run promo:render
```

Outputs:

```text
.generated/promo/local-ai-os-promo-16x9.mp4
.generated/promo/local-ai-os-promo-9x16.mp4
```

The generated directory is ignored by Git. A release/distribution workflow may upload an exact reviewed master as an artifact, but the repository keeps the proof, manifest, renderer and verification contract as source.

## QA

`npm run qa` includes `npm run promo:check`. The promo check fails when:

- the source proof is not public-approved and verified;
- a numeric claim drifts from the proof;
- an unsupported improvement/customer claim appears;
- the accessible in-site film surface disappears;
- reduced-motion support disappears;
- one of the approved render targets is removed.

This keeps the marketing surface downstream of evidence instead of letting promotional copy become a second source of truth.
