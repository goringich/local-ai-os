import assert from 'node:assert/strict'
import test from 'node:test'
import { demoVerdict } from '../../src/demo-policy.mjs'

test('pending means no positive result even when scope is allowed', () => {
  assert.deepEqual(demoVerdict({ scopeViolation: false, evaluated: false }), {
    blocked: false,
    verdict: 'ОЖИДАЕТ ПРОВЕРКИ',
    state: 'pending',
  })
})

test('pending does not hide a requested out-of-scope action', () => {
  assert.deepEqual(demoVerdict({ scopeViolation: true, evaluated: false }), {
    blocked: true,
    verdict: 'ОЖИДАЕТ ПРОВЕРКИ',
    state: 'pending',
  })
})

test('verification must reject forbidden scope', () => {
  assert.deepEqual(demoVerdict({ scopeViolation: true, evaluated: true }), {
    blocked: true,
    verdict: 'BLOCKED · POLICY',
    state: 'blocked',
  })
})

test('only explicitly evaluated allowlisted path has illustrative pass', () => {
  assert.deepEqual(demoVerdict({ scopeViolation: false, evaluated: true }), {
    blocked: false,
    verdict: 'SIMULATED CHECKS PASS',
    state: 'simulated_pass',
  })
})
