import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const files = {
  readme: read('../README.md'),
  release: read('../docs/release-pipeline.md'),
  architecture: read('../docs/technical-architecture.md'),
  growth: read('../docs/growth-readiness.md'),
  app: read('../src/ProductSite.tsx'),
  manifest: read('../docs/product/manifest.json'),
}

const required = [
  ['readme', 'Diagnostic: 9,900 ₽'],
  ['readme', '49,900 ₽ pilot'],
  ['release', 'Obsidian decision note'],
  ['release', 'npm run qa'],
  ['release', 'Post-release note'],
  ['architecture', 'Source of truth'],
  ['architecture', 'Release layer'],
  ['architecture', 'Project Atlas'],
  ['growth', 'Status: incubation'],
  ['growth', 'Do not buy traffic for the current product shell'],
  ['growth', 'one narrow external workflow'],
  ['app', 'proof cohort'],
  ['app', 'bounded context'],
  ['manifest', 'sourceOfTruth'],
  ['manifest', 'codex-orchestrator'],
  ['manifest', 'project-atlas'],
]

for (const [file, value] of required) {
  if (!files[file].includes(value)) {
    throw new Error(`Missing documentation invariant in ${file}: ${value}`)
  }
}

const forbidden = ['Frontend Developer', 'резюме', 'portfolio template']
for (const value of forbidden) {
  const haystack = Object.values(files).join('\n').toLowerCase()
  if (haystack.includes(value.toLowerCase())) {
    throw new Error(`Product docs coupled to portfolio language: ${value}`)
  }
}

execFileSync('node', ['scripts/build-product-docs.mjs', '--check'], { cwd: new URL('..', import.meta.url), stdio: 'inherit' })
console.log(`Documentation contract OK: ${required.length} invariants and generated snapshot`)
