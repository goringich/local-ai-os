import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const proofDir = resolve(new URL('../public/proofs', import.meta.url).pathname)
const index = JSON.parse(readFileSync(resolve(proofDir, 'index.json'), 'utf8'))
const forbidden = [
  /\/home\//i, /\/users\//i, /\\\\/, /\.env\b/i, /auth\.json/i, /cookie/i,
  /password/i, /secret/i, /token\s*[:=]/i, /raw prompt/i, /raw response/i, /private repo/i,
]
const metricUnits = new Set(['runs', 'characters', 'tokens', 'minutes', 'files', 'count'])
const proofFiles = readdirSync(proofDir).filter((file) => file.endsWith('.json') && file !== 'index.json')
if (!Array.isArray(index.proofs) || index.proofs.length !== proofFiles.length) throw new Error('Proof index does not match proof files')

for (const file of proofFiles) {
  const proof = JSON.parse(readFileSync(resolve(proofDir, file), 'utf8'))
  for (const key of ['id', 'kind', 'status', 'title', 'workflow', 'capturedAt', 'productVersion', 'approvedForPublic', 'before', 'assisted', 'verification', 'limitations']) {
    if (!(key in proof)) throw new Error(`${file}: missing ${key}`)
  }
  if (file !== `${proof.id}.json` || !index.proofs.some((item) => item.id === proof.id)) throw new Error(`${file}: index/id drift`)
  if (proof.kind !== 'founder-proof' && proof.kind !== 'customer-proof') throw new Error(`${file}: invalid kind`)
  if (proof.approvedForPublic !== true) throw new Error(`${file}: public approval missing`)
  for (const metric of [...proof.before, ...proof.assisted]) {
    if (!metric.label || !metric.source || !metricUnits.has(metric.unit)) throw new Error(`${file}: invalid metric`)
    if (typeof metric.value !== 'number' && metric.value !== 'unavailable') throw new Error(`${file}: metric must be a number or unavailable`)
    if (typeof metric.value === 'number' && /estimated|inferred|assumed/i.test(metric.source)) throw new Error(`${file}: numeric metric source is not recorded evidence`)
  }
  if (proof.status === 'verified' && !proof.verification.some((entry) => entry.result === 'pass' && entry.evidence)) {
    throw new Error(`${file}: verified proof lacks passing verification evidence`)
  }
  const serialized = JSON.stringify(proof)
  if (forbidden.some((pattern) => pattern.test(serialized))) throw new Error(`${file}: forbidden public content`)
}
console.log(`Proof contract OK: ${proofFiles.length} public-safe proof(s)`)
