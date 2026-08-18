import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const manifest = JSON.parse(readFileSync(resolve('public/promo/local-ai-os-promo.json'), 'utf8'))
const proof = JSON.parse(readFileSync(resolve(`public/proofs/${manifest.proofId}.json`), 'utf8'))
const app = readFileSync(resolve('src/App.tsx'), 'utf8')
const film = readFileSync(resolve('src/PromoFilm.tsx'), 'utf8')
const css = readFileSync(resolve('src/promo-film.css'), 'utf8')
const renderer = readFileSync(resolve('scripts/render-promo-video.py'), 'utf8')

if (manifest.schemaVersion !== '2026-08-18.local-ai-os-promo.v1') throw new Error('Unsupported promo manifest schema')
if (manifest.durationSeconds !== 25) throw new Error('Promo duration drifted from the approved 25 second contract')
if (!proof.approvedForPublic || proof.status !== 'verified') throw new Error('Promo source proof is not public-approved verified evidence')

for (const claim of manifest.claims) {
  const source = proof.assisted.find((metric) => metric.label === claim.label)
  if (!source) throw new Error(`Promo claim has no proof metric: ${claim.label}`)
  if (source.value !== claim.expectedValue) throw new Error(`Promo claim drift: ${claim.label}`)
}

const forbiddenClaimPatterns = [
  /\b\d+(?:[.,]\d+)?\s*%\s*(?:faster|быстрее|better|лучше|less|меньше)/i,
  /customer result/i,
  /guaranteed improvement/i,
]
const promoCopy = `${JSON.stringify(manifest)}\n${film}`
for (const pattern of forbiddenClaimPatterns) if (pattern.test(promoCopy)) throw new Error(`Unsupported promo claim: ${pattern}`)

const required = [
  [app, '<PromoFilm />', 'mounted promo surface'],
  [film, 'aria-modal="true"', 'accessible film dialog'],
  [film, 'promo_film_open', 'aggregate film-open event'],
  [film, 'Matched baseline: unavailable', 'honest baseline boundary'],
  [film, 'founder-context-control-001.json', 'live public proof binding'],
  [css, '@media (prefers-reduced-motion: reduce)', 'reduced-motion fallback'],
  [renderer, 'local-ai-os-promo-16x9.mp4', 'landscape render target'],
  [renderer, 'local-ai-os-promo-9x16.mp4', 'vertical render target'],
]
for (const [source, token, label] of required) if (!source.includes(token)) throw new Error(`Missing promo invariant: ${label}`)

console.log(`Promo contract OK: ${manifest.claims.length} evidence-bound claims, ${manifest.formats.length} render formats`)
