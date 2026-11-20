import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
const BASE = 'http://127.0.0.1:4173/local-ai-os'
const SHOT_DIR = ROOT + '/test-artifacts/product-browser'
mkdirSync(SHOT_DIR, { recursive: true })

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CI: '1' },
})
let serverLog = ''
server.stdout.on('data', chunk => { serverLog += String(chunk) })
server.stderr.on('data', chunk => { serverLog += String(chunk) })

async function ready() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Preview exited: ' + serverLog)
    try {
      const response = await fetch(BASE + '/', { signal: AbortSignal.timeout(1500) })
      if (response.ok) return
    } catch { /* server has not bound yet */ }
    await delay(200)
  }
  throw new Error('Preview failed to start: ' + serverLog)
}

let browser
async function pageFor(context, route, errors) {
  const page = await context.newPage()
  page.on('pageerror', error => { errors.push(route + ': ' + error.message) })
  const response = await page.goto(BASE + route, { waitUntil: 'networkidle' })
  assert.equal(response?.status(), 200, 'Direct route must return 200: ' + route)
  assert.ok(await page.locator('main').count(), 'A main landmark is required: ' + route)
  return page
}

function report(name) { console.log('PASS browser: ' + name) }

try {
  await ready()
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const errors = []

  const home = await pageFor(desktop, '/', errors)
  assert.ok(await home.getByText('AI-агенты пишут код.', { exact: false }).count())
  assert.ok(await home.getByRole('link', { name: /Попробовать демо/ }).count())
  assert.ok(await home.locator('.hero-dashboard').count(), 'A real-looking but explicitly simulated first-screen workbench is required')
  await home.screenshot({ path: SHOT_DIR + '/home-desktop.png', fullPage: true })
  report('home: product positioning, demo CTA, and actual preview UI')

  const demo = await pageFor(desktop, '/demo', errors)
  assert.ok(await demo.getByText('СИМУЛЯЦИЯ · БЕЗ ДОСТУПА К ПРОЕКТАМ').count())
  await demo.getByRole('button', { name: /Исправить дефект/ }).click()
  await demo.locator('.exp-stage-track button').nth(2).click()
  await demo.getByRole('button', { name: 'Попробовать запрещённое действие' }).click()
  assert.ok(await demo.getByText('DENIED BEFORE EXECUTION').count())
  await demo.locator('.exp-stage-track button').nth(4).click()
  await demo.getByRole('button', { name: 'Проверить сценарий' }).click()
  await demo.locator('.exp-stage-track button').nth(5).click()
  assert.ok(await demo.getByText('BLOCKED · POLICY', { exact: true }).count())
  assert.ok(await demo.getByText('НЕ ПРОВЕРЕНО', { exact: true }).count())
  await demo.getByRole('button', { name: /Защитить проект/ }).click()
  assert.ok(await demo.getByText('ОЖИДАЕТ ПРОВЕРКИ', { exact: true }).count())
  await demo.locator('.exp-stage-track button').nth(2).click()
  await demo.getByRole('button', { name: 'Попробовать запрещённое действие' }).click()
  await demo.getByRole('button', { name: 'Разрешённый scope' }).click()
  await demo.locator('.exp-stage-track button').nth(4).click()
  await demo.getByRole('button', { name: 'Проверить сценарий' }).click()
  await demo.locator('.exp-stage-track button').nth(5).click()
  assert.ok(await demo.getByText('SIMULATED CHECKS PASS', { exact: true }).count())
  assert.ok(await demo.getByText('НЕ ПРОВЕРЕНО', { exact: true }).count())
  await demo.screenshot({ path: SHOT_DIR + '/demo-desktop.png', fullPage: true })
  report('demo: scope rejection, reset, approval, verification and honest status')

  const value = await pageFor(desktop, '/value', errors)
  assert.ok(await value.getByText('Диагностика · 9 900 ₽').count())
  assert.ok(await value.getByText('Ограниченный пилот · 49 900 ₽').count())
  assert.ok(await value.getByText('Введите значения').count())
  await value.locator('#exp-time').fill('100')
  await value.locator('#exp-rate').fill('1800')
  assert.ok(await value.getByText('12 990 ₽').count() || await value.getByText('12 990 ₽').count(), 'Calculator must use the buyer inputs')
  await value.screenshot({ path: SHOT_DIR + '/value-desktop.png', fullPage: true })
  report('value: exact existing offer, no invented initial ROI, buyer inputs work')

  const compare = await pageFor(desktop, '/compare', errors)
  for (const competitor of ['Cursor Projects', 'Factory Missions', 'GitHub Copilot agents', 'OpenHands', 'Letta Agent SDK', 'Claude Code']) {
    assert.ok(await compare.getByText(competitor, { exact: true }).count(), 'Missing competitor: ' + competitor)
  }
  report('compare: competitor overlap and evidence boundaries')

  const architecture = await pageFor(desktop, '/system-architecture', errors)
  assert.equal(await architecture.locator('.archx-layer-picker button').count(), 11, 'All eleven architecture layers must be selectable')
  await architecture.locator('.archx-layer-picker button').nth(8).click()
  assert.ok(await architecture.getByText('Доказательства и качество', { exact: true }).count())
  await architecture.screenshot({ path: SHOT_DIR + '/architecture-desktop.png', fullPage: true })
  report('architecture: navigable eleven-layer technical map')

  const whitepaper = await pageFor(desktop, '/whitepaper', errors)
  assert.equal(await whitepaper.locator('.whitepaper-sidebar nav button').count(), 33)
  await whitepaper.locator('#whitepaper-search').fill('Mission Ledger')
  assert.ok((await whitepaper.locator('.whitepaper-sidebar nav button').count()) >= 1)
  await whitepaper.locator('.whitepaper-sidebar nav button').last().click()
  assert.ok(new URL(whitepaper.url()).searchParams.has('chapter'))
  assert.ok(await whitepaper.locator('.whitepaper-rendered').innerText())
  await whitepaper.screenshot({ path: SHOT_DIR + '/whitepaper-desktop.png', fullPage: false })
  report('whitepaper: all 33 chapters, search, direct chapter URL')

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true })
  for (const route of ['/', '/demo', '/value', '/compare', '/system-architecture', '/whitepaper']) {
    const p = await pageFor(mobile, route, errors)
    const layout = await p.evaluate(() => ({
      viewport: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    assert.ok(layout.scroll <= layout.viewport + 2, 'Horizontal document overflow at ' + route + ': ' + JSON.stringify(layout))
    if (route === '/demo') {
      await p.locator('.exp-stage-track button').nth(2).click()
      await p.getByRole('button', { name: 'Попробовать запрещённое действие' }).click()
      assert.ok(await p.getByText('DENIED BEFORE EXECUTION').count())
      await p.screenshot({ path: SHOT_DIR + '/demo-mobile.png', fullPage: true })
    }
    if (route === '/') await p.screenshot({ path: SHOT_DIR + '/home-mobile.png', fullPage: true })
    await p.close()
  }
  report('mobile: six routes without page overflow, interactive permission controls')

  assert.deepEqual(errors, [], 'Uncaught browser exceptions: ' + errors.join('; '))
  report('no uncaught JavaScript errors across desktop/mobile journeys')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
