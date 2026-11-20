import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/product/manifest.json'), 'utf8'))
const proofIndex = JSON.parse(readFileSync(resolve(root, 'public/proofs/index.json'), 'utf8'))
const routes = ['/demo', '/whitepaper', '/value', '/compare', '/proofs', ...proofIndex.proofs.map((proof) => '/proofs/' + proof.id), ...manifest.documents.map((doc) => doc.route)]
const index = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
const origin = 'https://goringich.github.io/local-ai-os'

const marketing = {
  '/demo': ['Интерактивное демо — LOCAL AI OS', 'Попробуйте на примере работу с проектным контекстом, правами AI-агента и доказательной проверкой результата. Демо без регистрации и доступа к вашим данным.'],
  '/whitepaper': ['Полная техническая спецификация — LOCAL AI OS', '33 раздела по продукту и архитектуре LOCAL AI OS: память, RAG, миссии, агенты, безопасность, конкуренты, восстановление, ограничения и экономика.'],
  '/value': ['Что покупает клиент — LOCAL AI OS', 'Диагностика за 9 900 ₽, пилот за 49 900 ₽, состав передаваемых материалов и условия приёмки. Границы текущей услуги и калькулятор стоимости проблемы.'],
  '/compare': ['Альтернативы и отличия — LOCAL AI OS', 'Сравнение LOCAL AI OS с Cursor, Factory Missions, Codex, Claude Code, OpenHands, Letta и Cline: пересечения, ограничения и план доказательных испытаний.'],
  '/proofs': ['Проверяемые доказательства — LOCAL AI OS', 'Публичные безопасные доказательства и ограничения: внутренние агрегаты отдельно от результатов клиентов, без выдуманного ROI.'],
  '/system-architecture': ['Полная архитектура системы — LOCAL AI OS', 'Исследуйте все 11 уровней LOCAL AI OS: источники, входы, выходы, полномочия, память, миссии, агенты и проверка результата.'],
}

function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function metadataFor(route) {
  if (marketing[route]) return marketing[route]
  const proof = proofIndex.proofs.find((item) => '/proofs/' + item.id === route)
  if (proof) return [proof.title + ' — LOCAL AI OS', proof.summary]
  const doc = manifest.documents.find((item) => item.route === route)
  if (doc) return [doc.id.replaceAll('-', ' ') + ' — LOCAL AI OS', 'Техническая документация LOCAL AI OS: ' + doc.id.replaceAll('-', ' ') + '. Статус: ' + doc.status + '.']
  throw new Error('Missing metadata source for ' + route)
}

function setMeta(html, pattern, value, route) {
  if (!pattern.test(html)) throw new Error('Missing HTML metadata for ' + route + ': ' + pattern)
  return html.replace(pattern, (_, prefix, suffix) => prefix + value + suffix)
}

function renderHead(route) {
  const [rawTitle, rawDescription] = metadataFor(route)
  const title = escapeAttribute(rawTitle)
  const description = escapeAttribute(rawDescription)
  const url = escapeAttribute(origin + route)
  let html = index.replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>')
  html = setMeta(html, /(<meta name="description" content=")([^"]*)(")/, description, route)
  html = setMeta(html, /(<meta property="og:title" content=")([^"]*)(")/, title, route)
  html = setMeta(html, /(<meta property="og:description" content=")([^"]*)(")/, description, route)
  html = setMeta(html, /(<meta property="og:url" content=")([^"]*)(")/, url, route)
  html = setMeta(html, /(<meta name="twitter:title" content=")([^"]*)(")/, title, route)
  html = setMeta(html, /(<meta name="twitter:description" content=")([^"]*)(")/, description, route)
  html = setMeta(html, /(<link rel="canonical" href=")([^"]*)(")/, url, route)
  return html
}

for (const route of routes) {
  const outputDir = resolve(root, 'dist', route.slice(1))
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(resolve(outputDir, 'index.html'), renderHead(route))
}
console.log('Static Pages route artifacts generated with unique SEO metadata: ' + routes.length)
