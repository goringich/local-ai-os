/**
 * Deterministic tutorial verdict only. Never represents actual runtime status.
 * Actual Mission Ledger verification and deployment are separate authorities.
 */
export function demoVerdict({ scopeViolation, evaluated }) {
  if (!evaluated) {
    return { blocked: scopeViolation, verdict: 'ОЖИДАЕТ ПРОВЕРКИ', state: 'pending' }
  }
  if (scopeViolation) {
    return { blocked: true, verdict: 'BLOCKED · POLICY', state: 'blocked' }
  }
  return { blocked: false, verdict: 'SIMULATED CHECKS PASS', state: 'simulated_pass' }
}
