import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const repo = process.env.GITHUB_REPOSITORY || 'goringich/local-ai-os'
const server = process.env.GITHUB_SERVER_URL || 'https://github.com'
const sha = process.env.GITHUB_SHA || readGit(['rev-parse', 'HEAD']) || 'local'
const ref = process.env.GITHUB_REF_NAME || readGit(['branch', '--show-current']) || 'local'
const runId = process.env.GITHUB_RUN_ID || ''
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1'
const workflowUrl = runId
  ? `${server}/${repo}/actions/runs/${runId}/attempts/${runAttempt}`
  : `${server}/${repo}/actions/workflows/deploy-pages.yml`

const payload = {
  product: 'LOCAL AI OS',
  version: pkg.version,
  channel: ref === 'main' ? 'production' : 'preview',
  state: 'source-snapshot',
  deploymentVerification: 'not-asserted-by-build',
  sourceRef: ref,
  commit: sha,
  generatedAt: process.env.GITHUB_RUN_ID ? new Date().toISOString() : 'local-dev',
  deploymentUrl: 'https://goringich.github.io/local-ai-os/',
  workflowUrl,
  checks: [
    { name: 'offer-contract', state: 'not-asserted', summary: 'See the linked CI run for offer-check results; this source snapshot is generated before validation.' },
    { name: 'lint', state: 'not-asserted', summary: 'See linked CI run for actual ESLint verdict; no result can be asserted by this generator.' },
    { name: 'build', state: 'not-asserted', summary: 'This file is written before build completion; inspect CI for the exact commit.' },
    { name: 'docs-sync', state: 'not-asserted', summary: 'Reviewed sync policy is in source; executed sync/host parity requires separate evidence.' },
  ],
}

writeJson(resolve(root, 'public/release-status.json'), payload)
writeFileSync(
  resolve(root, 'docs/release-status.md'),
  `# LOCAL AI OS release status\n\n` +
    `- Product: ${payload.product}\n` +
    `- Version: ${payload.version}\n` +
    `- Channel: ${payload.channel}\n` +
    `- State: ${payload.state}\n` +
    `- Deployment verification: ${payload.deploymentVerification}\n` +
    `- Source ref: ${payload.sourceRef}\n` +
    `- Commit: ${payload.commit}\n` +
    `- Generated: ${payload.generatedAt}\n` +
    `- Deployment: ${payload.deploymentUrl}\n` +
    `- Workflow: ${payload.workflowUrl}\n`,
)

console.log(`Release status generated for ${payload.product} ${payload.version} (${payload.channel})`)

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function readGit(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}
