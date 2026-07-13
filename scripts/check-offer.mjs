import { readFileSync } from 'node:fs'

const site = readFileSync(new URL('../src/ProductSite.tsx', import.meta.url), 'utf8')
const offer = readFileSync(new URL('../docs/offer.md', import.meta.url), 'utf8')
const cohort = readFileSync(new URL('../docs/proof-cohort.md', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const required = [
  [site, 'proof cohort'], [site, 'bounded context'], [site, 'scoped execution'], [site, 'verification'], [site, 'run report'],
  [site, 'https://t.me/a1gorithms'], [offer, '49,900 ₽'], [offer, '9,900 ₽'], [offer, 'five working days'],
  [cohort, 'acceptance checks'], [cohort, 'No full-autonomy promise'],
]
for (const [source, value] of required) if (!source.includes(value)) throw new Error(`Missing offer invariant: ${value}`)

const forbidden = ['my-cv', 'портфолио', 'Frontend Developer', 'резюме']
for (const value of forbidden) if (`${site}\n${html}`.toLowerCase().includes(value.toLowerCase())) throw new Error(`Portfolio coupling detected: ${value}`)
console.log(`Offer contract OK: ${required.length} proof-first invariants, no portfolio coupling`)
