import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const source = read('src/ProductExperience.tsx')
const agentInterfaces = read('src/AgentInterfaces.tsx')
const architecture = read('src/SystemArchitectureExplorer.tsx')
const architectureCss = read('src/architecture-explorer.css')
const policy = read('src/demo-policy.mjs')
const site = read('src/ProductSite.tsx')
const whitepaper = read('docs/public-technical-whitepaper-ru.md')
const whitepaperUI = read('src/TechnicalWhitepaper.tsx')
const css = read('src/product-experience.css')
const router = read('scripts/build-static-routes.mjs')
const routeCheck = read('scripts/check-routes.mjs')

const required = [
  ['three differentiated scenarios', 'id: \'resume\''],
  ['defect scenario', 'id: \'fix\''],
  ['privacy scenario', 'id: \'privacy\''],
  ['six-step interaction', "['06', 'Отчёт']"],
  ['accessible stepper', 'aria-current={stage === index'],
  ['permission toggle', 'setViolateScope(value)'],
  ['revalidation on policy change', 'setEvaluated(false)'],
  ['bounded status', 'ОЖИДАЕТ ПРОВЕРКИ'],
  ['scope denial', 'BLOCKED · POLICY'],
  ['outcome not measured', 'НЕ ПРОВЕРЕНО'],
  ['honest simulation banner', 'СИМУЛЯЦИЯ · БЕЗ ДОСТУПА К ПРОЕКТАМ'],
  ['no connected execution claim', 'не запускает AI'],
  ['baseline disclaimer', 'не прогноз эффекта'],
  ['buyer deliverables', '49 900 ₽'],
  ['buyer limitations', 'не self-service'],
  ['comparison primary sources', 'https://docs.factory.com/missions/overview'],
]
for (const [description, fragment] of required) {
  assert.ok((source + '\n' + policy).includes(fragment), 'Demo is missing '+ description)
}

for (const route of ['/demo', '/whitepaper', '/value', '/compare']) {
  assert.ok(site.includes("route === '" + route + "'"), 'Product router lacks ' + route)
  assert.ok(router.includes("'" + route + "'"), 'Static route generator lacks ' + route)
  assert.ok(routeCheck.includes("'" + route + "'"), 'Route verification lacks ' + route)
}
assert.ok(site.includes('<ExperiencePreview />'), 'Homepage does not expose interactive experience')
assert.ok(source.includes('<AgentInterfaces />'), 'Buyer site must explain the role of ChatGPT and Codex')
assert.ok(agentInterfaces.includes('SIMULATED') && agentInterfaces.includes('не подключённый ChatGPT'), 'Integration examples must be identified as simulations')
assert.ok(agentInterfaces.includes('merge') || agentInterfaces.includes('Merge'), 'Executor authority must remain explicit')
assert.equal((whitepaper.match(/^## [0-9]+\. /gm) ?? []).length, 33, 'Full whitepaper must contain 33 chapters')
assert.ok(whitepaperUI.includes('aria-current={item.id === section'), 'Reader must expose current chapter to assistive technology')
assert.ok(site.includes('lazy(() => import(\'./TechnicalWhitepaper\'))'), 'Whitepaper must be code-split')
assert.equal((architecture.match(/id: 'L(?:10|[0-9])'/g) ?? []).length, 11, 'Architecture explorer must cover exactly eleven layers')
assert.ok(site.includes('<SystemArchitectureExplorer />'), 'System architecture route lacks interactive explorer')
assert.ok(architecture.includes('aria-pressed={selected.id === layer.id}'), 'Architecture picker lacks keyboard-friendly selection semantics')
assert.ok(architectureCss.includes('@media (max-width:560px)'), 'Architecture explorer must support small viewports')
assert.ok(css.includes('@media (max-width:600px)'), 'Mobile experience layout missing')
assert.ok(css.includes('prefers-reduced-motion'), 'Reduced motion support missing')

const forbidden = [
  /fetch\s*\(/,
  /localStorage/,
  /sessionStorage/,
  /navigator\.sendBeacon/,
  /WebSocket/,
  /dangerouslySetInnerHTML/,
  /https?:\/\/[^'"]*(?:api\.openai\.com|localhost|127\.0\.0\.1)/,
]
for (const pattern of forbidden) {
  assert.ok(!pattern.test(source), 'Demo unexpectedly connects to runtime or unsafe browser API: ' + pattern)
}

execFileSync('node', ['--test', 'scripts/tests/demo-policy.test.mjs'], { cwd: new URL('..', import.meta.url), stdio: 'inherit' })
const publicProductDocs = [
  'docs/architecture-reference.md',
  'docs/buyer-experience-spec.md',
  'docs/competitive-positioning-2026.md',
  'docs/product/16-full-architecture.md',
  'docs/public-technical-whitepaper-ru.md',
]
for (const file of publicProductDocs) {
  const content = read(file)
  for (const forbiddenName of ['goringich/__home_organized', 'goringich/codex-orchestrator', 'goringich/home-admin']) {
    assert.ok(!content.includes(forbiddenName), 'Private repository name leaked in public product docs: ' + file)
  }
}

console.log('Demo contract OK: 3 scenarios, 6 stages, tested fail-closed policy, 3 static routes, no runtime bridge')
