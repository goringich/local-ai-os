export type ProofValue = number | 'unavailable'

export type ProofMetric = {
  label: string
  value: ProofValue
  unit: 'runs' | 'characters' | 'tokens' | 'minutes' | 'files' | 'count'
  source: string
}

export type Proof = {
  id: string
  kind: 'founder-proof' | 'customer-proof'
  status: 'verified' | 'partial' | 'unavailable'
  title: string
  workflow: string
  summary: string
  capturedAt: string
  productVersion: string
  approvedForPublic: boolean
  before: ProofMetric[]
  assisted: ProofMetric[]
  changedFileCategories: string[]
  verification: Array<{ label: string; result: 'pass' | 'fail' | 'unavailable'; evidence: string }>
  limitations: string[]
  shareText: string
}
