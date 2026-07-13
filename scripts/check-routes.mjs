import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/product/manifest.json'), 'utf8'))
const proofIndex = JSON.parse(readFileSync(resolve(root, 'public/proofs/index.json'), 'utf8'))
const routes = ['/', '/proofs', ...proofIndex.proofs.map((proof) => `/proofs/${proof.id}`), ...manifest.documents.map((doc) => doc.route)]
for (const route of routes) {
  const location = route === '/' ? resolve(root, 'dist/index.html') : resolve(root, 'dist', route.slice(1), 'index.html')
  if (!existsSync(location)) throw new Error(`Missing static route artifact: ${route}`)
}
console.log(`Direct static routes OK: ${routes.length}`)
