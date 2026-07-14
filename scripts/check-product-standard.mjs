import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const manifest = JSON.parse(readFileSync(resolve('docs/product-manifest.json'), 'utf8'))
const required = [
  'id', 'type', 'profile', 'stage', 'target_user', 'problem', 'outcome',
  'primary_wedge', 'time_to_first_value', 'primary_artifact', 'proof',
  'distribution_loop', 'founder_content_loop', 'conversion_event', 'metrics',
  'surfaces', 'security_privacy', 'delivery', 'acceptance', 'operations',
  'evidence', 'owner_blockers', 'paid_acquisition', 'unavailable_claims',
]
const profiles = new Set(['consumer', 'developer-tool', 'b2b-technical', 'service'])
const forbidden = /(?:\b(?:token|secret|password|api[_ -]?key)\b\s*[:=]|\b(?:ghp|sk-)[\w-]{16,}|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|\+\d{10,15})/i

if (manifest.schema_version !== '2026-07-13.product-manifest.v1') {
  throw new Error(`Unsupported product manifest schema: ${manifest.schema_version}`)
}
for (const field of required) {
  if (!(field in manifest)) throw new Error(`Product manifest is missing required field: ${field}`)
}
if (!profiles.has(manifest.profile)) throw new Error(`Unknown product profile: ${manifest.profile}`)
if (forbidden.test(JSON.stringify(manifest))) throw new Error('Product manifest contains secret-like material')
if (manifest.paid_acquisition?.status === 'allowed' && manifest.owner_blockers.length > 0) {
  throw new Error('Paid acquisition cannot be allowed while owner blockers remain')
}

console.log('Portable product manifest contract OK; host doctor remains authoritative for readiness claims')
