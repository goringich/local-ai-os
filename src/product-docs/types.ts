export type ProductDocBlock = { heading: string; body: string; bullets: string[] }
export type ProductDoc = {
  id: string
  route: string
  title: string
  status: 'stable' | 'experimental' | 'planned' | 'unavailable'
  summary: string
  blocks: ProductDocBlock[]
}
