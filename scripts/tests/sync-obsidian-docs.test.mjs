import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, linkSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'

const script = resolve('scripts/sync-obsidian-docs.mjs')

function fixture(t) {
  const dir = mkdtempSync(resolve(tmpdir(), 'product-docs-sync-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const home = resolve(dir, 'home')
  mkdirSync(home)
  const env = { ...process.env, HOME: home }
  for (const key of ['PRODUCT_OBSIDIAN_DIR', 'PRODUCT_DOCS_MIRROR_DIR', 'PRODUCT_ARCHITECTURE_NOTE', 'PRODUCT_ARCHITECTURE_MIRROR', 'OBSIDIAN_SYNC_DRY_RUN']) delete env[key]
  const obsidian = resolve(dir, 'approved-vault/product')
  const mirror = resolve(dir, 'approved-mirror/product')
  return { dir, home, obsidian, mirror, env, run: (extra = {}) => spawnSync(process.execPath, [script], { env: { ...env, ...extra }, encoding: 'utf8' }) }
}

test('unconfigured and unsafe destinations fail before writes', (t) => {
  const f = fixture(t)
  for (const [left, right] of [[undefined, undefined], [f.obsidian, undefined], ['relative', f.mirror], [f.obsidian, f.obsidian], [f.obsidian, resolve(f.obsidian, 'nested')], [process.cwd(), f.mirror]]) {
    const env = {}
    if (left) env.PRODUCT_OBSIDIAN_DIR = left
    if (right) env.PRODUCT_DOCS_MIRROR_DIR = right
    assert.notEqual(f.run(env).status, 0)
    assert.equal(existsSync(f.obsidian), false)
    assert.equal(existsSync(f.mirror), false)
  }
  assert.equal(existsSync(resolve(f.home, 'Desktop')), false)
})

test('configured dry run creates no destinations or canonical notes', (t) => {
  const f = fixture(t)
  const result = f.run({ PRODUCT_OBSIDIAN_DIR: f.obsidian, PRODUCT_DOCS_MIRROR_DIR: f.mirror, OBSIDIAN_SYNC_DRY_RUN: '1' })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Dry-run docs sync/)
  assert.equal(existsSync(f.obsidian), false)
  assert.equal(existsSync(f.mirror), false)
  assert.equal(existsSync(resolve(f.home, 'Desktop')), false)
})

test('symlink directory aliases cannot overlap a destination or source checkout', (t) => {
  const f = fixture(t)
  mkdirSync(f.obsidian, { recursive: true })
  const alias = resolve(f.dir, 'alias')
  symlinkSync(f.obsidian, alias, 'dir')
  const sourceAlias = resolve(f.dir, 'source-alias')
  symlinkSync(process.cwd(), sourceAlias, 'dir')
  for (const path of [alias, resolve(alias, 'nested'), sourceAlias]) {
    const result = f.run({ PRODUCT_OBSIDIAN_DIR: f.obsidian, PRODUCT_DOCS_MIRROR_DIR: path })
    assert.notEqual(result.status, 0)
    assert.equal(existsSync(resolve(f.obsidian, 'offer.md')), false)
  }
})

test('an unsafe late output or overlapping canonical note prevents all copying', (t) => {
  const f = fixture(t)
  mkdirSync(f.mirror, { recursive: true })
  const sentinel = resolve(f.dir, 'private.md')
  writeFileSync(sentinel, 'Preserve this note.\n')
  const alias = resolve(f.mirror, 'README.md')
  symlinkSync(sentinel, alias)
  const settings = { PRODUCT_OBSIDIAN_DIR: f.obsidian, PRODUCT_DOCS_MIRROR_DIR: f.mirror }
  assert.notEqual(f.run(settings).status, 0)
  assert.equal(existsSync(f.obsidian), false)
  assert.equal(readFileSync(sentinel, 'utf8'), 'Preserve this note.\n')
  rmSync(alias)
  const canonical = resolve(f.mirror, 'offer.md')
  writeFileSync(canonical, 'Keep canonical architecture.\n')
  assert.notEqual(f.run({ ...settings, PRODUCT_ARCHITECTURE_NOTE: canonical }).status, 0)
  assert.equal(existsSync(f.obsidian), false)
  assert.equal(readFileSync(canonical, 'utf8'), 'Keep canonical architecture.\n')
})

test('real sync copies curated docs only and preserves unrelated private files', (t) => {
  const f = fixture(t)
  const privateNote = resolve(f.home, 'private.md')
  writeFileSync(privateNote, '# Private\nDo not export this fixture.\n')
  const result = f.run({ PRODUCT_OBSIDIAN_DIR: f.obsidian, PRODUCT_DOCS_MIRROR_DIR: f.mirror })
  assert.equal(result.status, 0, result.stderr)
  for (const target of [f.obsidian, f.mirror]) {
    assert.equal(readFileSync(resolve(target, 'offer.md'), 'utf8'), readFileSync('docs/offer.md', 'utf8'))
    assert.equal(readFileSync(resolve(target, '11-recovery.md'), 'utf8'), readFileSync('docs/product/11-recovery.md', 'utf8'))
    const index = readFileSync(resolve(target, 'README.md'), 'utf8')
    assert.ok(!index.includes(f.home))
    assert.ok(!index.includes('/home/'))
    assert.equal(existsSync(resolve(target, 'private.md')), false)
  }
  assert.equal(readFileSync(privateNote, 'utf8'), '# Private\nDo not export this fixture.\n')
  assert.equal(existsSync(resolve(f.home, 'Desktop')), false)
})

test('hardlinked output cannot overwrite a private canonical note', (t) => {
  const f = fixture(t)
  mkdirSync(f.mirror, { recursive: true })
  const note = resolve(f.dir, 'canonical.md')
  writeFileSync(note, '# Architecture\n\n## Коротко\nKeep private architecture.\n')
  linkSync(note, resolve(f.mirror, 'offer.md'))
  const result = f.run({ PRODUCT_OBSIDIAN_DIR: f.obsidian, PRODUCT_DOCS_MIRROR_DIR: f.mirror, PRODUCT_ARCHITECTURE_NOTE: note })
  assert.notEqual(result.status, 0)
  assert.equal(existsSync(f.obsidian), false)
  assert.equal(readFileSync(note, 'utf8'), '# Architecture\n\n## Коротко\nKeep private architecture.\n')
})

test('canonical section update needs explicit existing note paths', (t) => {
  const f = fixture(t)
  const note = resolve(f.dir, 'architecture.md')
  const missing = resolve(f.dir, 'missing-mirror.md')
  writeFileSync(note, '# Architecture\n\n## Коротко\n\nKeep existing architecture.\n')
  const result = f.run({ PRODUCT_OBSIDIAN_DIR: f.obsidian, PRODUCT_DOCS_MIRROR_DIR: f.mirror, PRODUCT_ARCHITECTURE_NOTE: note, PRODUCT_ARCHITECTURE_MIRROR: missing })
  assert.equal(result.status, 0, result.stderr)
  const content = readFileSync(note, 'utf8')
  assert.match(content, /Keep existing architecture/)
  assert.match(content, /LOCAL AI OS productization pipeline/)
  assert.ok(!content.includes('/home/'))
  assert.equal(existsSync(missing), false)
})
