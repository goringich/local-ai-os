import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const snapshot = JSON.parse(readFileSync(new URL('../public/release-status.json', import.meta.url), 'utf8'))
assert.equal(snapshot.product, 'LOCAL AI OS')
assert.equal(snapshot.state, 'source-snapshot')
assert.equal(snapshot.deploymentVerification, 'not-asserted-by-build')
assert.ok(snapshot.commit && snapshot.commit !== 'unknown', 'Source commit must be present')
assert.ok(snapshot.workflowUrl.startsWith('https://github.com/'), 'Workflow evidence link must be explicit')
assert.ok(snapshot.deploymentUrl.startsWith('https://'), 'Expected deploy target must be explicit')
assert.ok(Array.isArray(snapshot.checks) && snapshot.checks.length > 0)
for (const check of snapshot.checks) {
  assert.equal(check.state, 'not-asserted', 'Build-stage file must not fabricate a result for ' + check.name)
  assert.ok(check.summary.includes('CI') || check.summary.includes('evidence') || check.summary.includes('source'))
}
console.log('Release snapshot truth: source-only, no implied CI/deploy/host verdict')
