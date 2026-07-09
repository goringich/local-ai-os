import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const files = {
  readme: read('../README.md'),
  release: read('../docs/release-pipeline.md'),
  architecture: read('../docs/technical-architecture.md'),
  portal: read('../src/ProductPortal.tsx'),
}

const required = [
  ['readme', 'Diagnostic: 9,900 ₽'],
  ['readme', 'Pilot: 49,900 ₽'],
  ['release', 'Obsidian decision note'],
  ['release', 'npm run qa'],
  ['release', 'Post-release note'],
  ['architecture', 'Source of truth'],
  ['architecture', 'Release layer'],
  ['architecture', 'Project Atlas'],
  ['portal', '49 900 ₽'],
  ['portal', '9 900 ₽'],
  ['portal', '5 рабочих дней'],
  ['portal', 'Obsidian'],
  ['portal', 'Codex'],
  ['portal', 'Project Atlas'],
  ['portal', 'Release'],
  ['portal', 'Безопасность'],
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

console.log(`Documentation contract OK: ${required.length} invariants`)
