export type DemoVerdict = {
  blocked: boolean
  verdict: string
  state: 'pending' | 'blocked' | 'simulated_pass'
}

export function demoVerdict(input: {
  scopeViolation: boolean
  evaluated: boolean
}): DemoVerdict
