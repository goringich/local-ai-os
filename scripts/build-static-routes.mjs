import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/product/manifest.json'), 'utf8'))
const proofIndex = JSON.parse(readFileSync(resolve(root, 'public/proofs/index.json'), 'utf8'))
const routes = ['/proofs', ...proofIndex.proofs.map((proof) => `/proofs/${proof.id}`), ...manifest.documents.map((doc) => doc.route)]
const index = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
for (const route of routes) {
  const outputDir = resolve(root, 'dist', route.slice(1))
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(resolve(outputDir, 'index.html'), index)
}
console.log(`Static Pages route artifacts generated: ${routes.length}`)
