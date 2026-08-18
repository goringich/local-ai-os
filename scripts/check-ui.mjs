import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const site = readFileSync(new URL('../src/ProductSite.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const promo = readFileSync(new URL('../src/PromoFilm.tsx', import.meta.url), 'utf8')
const promoCss = readFileSync(new URL('../src/promo-film.css', import.meta.url), 'utf8')
const required = [
  [site, 'className="skip-link"', 'skip link'],
  [site, 'id="content"', 'main content target'],
  [site, '<Header route={route} />', 'shared navigation'],
  [site, 'aria-label="Workflow LOCAL AI OS"', 'workflow label'],
  [site, 'proof cohort', 'primary proof cohort CTA'],
  [site, 'function TechnicalPage', 'technical portal'],
  [css, '@media (max-width:850px)', 'responsive breakpoint'],
  [css, 'prefers-reduced-motion', 'reduced motion fallback'],
  [app, '<PromoFilm />', 'product film launcher'],
  [promo, 'aria-modal="true"', 'accessible product-film dialog'],
  [promo, 'promo_film_open', 'product-film aggregate event'],
  [promoCss, '@media (prefers-reduced-motion: reduce)', 'product-film reduced motion fallback'],
]
for (const [source, value, label] of required) if (!source.includes(value)) throw new Error(`Missing UI invariant: ${label}`)
const homeStart = site.indexOf('function Home()')
const heroStart = site.indexOf('className="hero"', homeStart)
const proofStart = site.indexOf('<ProofSummary', homeStart)
if (homeStart < 0 || heroStart < homeStart || proofStart < heroStart) throw new Error('Home is not proof-first')
console.log(`UI contract OK: ${required.length} accessibility/responsive/proof-first/product-film invariants`)
