import { useEffect, useMemo, useState } from 'react'
import ProductDetails from './ProductDetails'

const TELEGRAM_URL = 'https://t.me/a1gorithms'
const EMAIL_URL = 'mailto:actingsv@gmail.com?subject=LOCAL%20AI%20OS%20—%20диагностика'
const REPO_URL = 'https://github.com/goringich/local-ai-os'

type ReleaseStatus = {
  product: string
  version: string
  channel: string
  state: string
  sourceRef: string
  commit: string
  generatedAt: string
  deploymentUrl: string
  workflowUrl: string
  checks: Array<{ name: string; state: string; summary: string }>
}

const fallbackRelease: ReleaseStatus = {
  product: 'LOCAL AI OS',
  version: '0.1.0',
  channel: 'local',
  state: 'preview',
  sourceRef: 'local workspace',
  commit: 'unbuilt',
  generatedAt: 'local-dev',
  deploymentUrl: 'https://goringich.github.io/local-ai-os/',
  workflowUrl: `${REPO_URL}/actions/workflows/deploy-pages.yml`,
  checks: [
    { name: 'offer-contract', state: 'pending', summary: 'Проверяется скриптом check:offer.' },
    { name: 'lint', state: 'pending', summary: 'ESLint защищает React/TypeScript слой.' },
    { name: 'build', state: 'pending', summary: 'Vite собирает production bundle.' },
    { name: 'docs-sync', state: 'pending', summary: 'Документация зеркалится в Obsidian вручную или pipeline step.' },
  ],
}

const architecture = [
  {
    id: 'source',
    index: '01',
    title: 'Obsidian source of truth',
    short: 'Память',
    text: 'Архитектура, решения, цели, инциденты, приёмка и продуктовые документы живут в Obsidian и зеркалируются в tracked docs.',
    status: 'adopted',
  },
  {
    id: 'bootstrap',
    index: '02',
    title: 'Health gate + context bootstrap',
    short: 'Контекст',
    text: 'Перед работой агент получает состояние машины, scope-specific context pack, source notes и границы безопасности.',
    status: 'adopted',
  },
  {
    id: 'runtime',
    index: '03',
    title: 'Ollama + Open WebUI + OpenClaw',
    short: 'Runtime',
    text: 'Локальные модели, основной UI, guarded assistant/router и OpenHarness работают как один local-first runtime center.',
    status: 'adopted',
  },
  {
    id: 'execution',
    index: '04',
    title: 'Codex + run contracts',
    short: 'Доставка',
    text: 'Изменения проходят через scoped source edits, проверки, ai-os-run-contract, run reports и human-readable summary.',
    status: 'adopted',
  },
  {
    id: 'visibility',
    index: '05',
    title: 'Project Atlas + release status',
    short: 'Видимость',
    text: 'Оператор видит здоровье, очереди, релизы, sync blockers и следующий точный action без сырого prompt/secret контента.',
    status: 'active',
  },
]

const releasePipeline = [
  ['Change', 'PR или scoped commit меняет продукт, docs, manifest или pipeline.'],
  ['Verify', 'check:offer, lint, TypeScript build и high severity audit в CI.'],
  ['Package', 'build-release-status формирует public/release-status.json для UI.'],
  ['Deploy', 'GitHub Pages публикует production bundle из dist.'],
  ['Sync', 'docs:sync зеркалит технические документы в Obsidian и tracked mirror.'],
]

const docs = [
  ['Product contract', 'Оффер, boundaries, pilot scope, acceptance evidence.', 'docs/offer.md'],
  ['Technical manual', 'Архитектура, data contracts, release flow, security, operations.', 'docs/product-technical.md'],
  ['Architecture map', 'Mermaid-карта и роль каждого слоя в local-first контуре.', 'docs/architecture.md'],
  ['Release pipeline', 'GitHub Pages, release manifest, checks, rollback и ручной dispatch.', 'docs/release-pipeline.md'],
  ['Obsidian sync', 'Какие документы куда зеркалятся и какие note остаются canonical.', 'docs/obsidian-sync.md'],
]

const acceptance = [
  ['Декларированные файлы', 'Поставка совпадает с перечнем имён, версий, хешей и конфигураций.'],
  ['Долг продвижения', 'Известные ограничения и отложенные задачи зафиксированы с приоритетами.'],
  ['Риск секретов', 'Репозитории и конфигурации проверены без копирования значений секретов.'],
  ['Restore dry-run', 'Восстановление выполняется на чистом пути без доступа в интернет.'],
  ['UI и runtime', 'Интерфейс, основные сервисы и критические сценарии запуска проверены.'],
  ['Письменный отчёт', 'Итоги, артефакты проверки и рекомендации остаются у владельца системы.'],
]

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 12 5 5L20 6" />
    </svg>
  )
}

function Header() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [])

  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="LOCAL AI OS — в начало">LOCAL AI OS</a>
      <button className="menu-button" type="button" aria-label="Открыть меню" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span /><span /><span />
      </button>
      <nav className={open ? 'nav is-open' : 'nav'} aria-label="Основная навигация">
        <a href="#architecture" onClick={() => setOpen(false)}>Архитектура</a>
        <a href="#releases" onClick={() => setOpen(false)}>Релизы</a>
        <a href="#docs" onClick={() => setOpen(false)}>Документация</a>
        <a href="#delivery" onClick={() => setOpen(false)}>Поставка</a>
        <a href="#technical" onClick={() => setOpen(false)}>Техника</a>
      </nav>
      <a className="header-cta" href={TELEGRAM_URL} target="_blank" rel="noreferrer">
        Обсудить пилот <ArrowIcon />
      </a>
    </header>
  )
}

function useReleaseStatus() {
  const [status, setStatus] = useState<ReleaseStatus>(fallbackRelease)

  useEffect(() => {
    const controller = new AbortController()
    const base = import.meta.env.BASE_URL || '/'
    fetch(`${base}release-status.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`release status ${response.status}`)
        return response.json() as Promise<ReleaseStatus>
      })
      .then(setStatus)
      .catch(() => setStatus(fallbackRelease))
    return () => controller.abort()
  }, [])

  return status
}

function ArchitectureExplorer() {
  const [activeId, setActiveId] = useState(architecture[0].id)
  const active = useMemo(() => architecture.find((item) => item.id === activeId) ?? architecture[0], [activeId])

  return (
    <div className="architecture-explorer">
      <div className="architecture-map" aria-label="Интерактивная карта архитектуры LOCAL AI OS">
        <div className="map-grid" aria-hidden="true" />
        {architecture.map((item, index) => (
          <button
            className={item.id === active.id ? 'map-node is-active' : 'map-node'}
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
          >
            <span>{item.index}</span>
            <strong>{item.short}</strong>
            <small>{item.status}</small>
            {index < architecture.length - 1 && <i aria-hidden="true" />}
          </button>
        ))}
      </div>
      <article className="architecture-detail" aria-live="polite">
        <span className="mono-label">layer://{active.id}</span>
        <h3>{active.title}</h3>
        <p>{active.text}</p>
      </article>
    </div>
  )
}

function ReleasePanel() {
  const release = useReleaseStatus()
  const shortCommit = release.commit.length > 10 ? release.commit.slice(0, 10) : release.commit

  return (
    <section className="release-panel" id="releases" aria-labelledby="release-title">
      <div className="section-heading">
        <h2 id="release-title">Состояние релиза видно в продукте.</h2>
        <p>Pipeline генерирует manifest, UI читает его как обычный product artifact, а GitHub Pages показывает текущий канал и проверки.</p>
      </div>
      <div className="release-grid">
        <article className="release-card">
          <span className="mono-label">release://{release.channel}</span>
          <h3>{release.product} {release.version}</h3>
          <dl>
            <div><dt>state</dt><dd>{release.state}</dd></div>
            <div><dt>ref</dt><dd>{release.sourceRef}</dd></div>
            <div><dt>commit</dt><dd>{shortCommit}</dd></div>
            <div><dt>generated</dt><dd>{release.generatedAt}</dd></div>
          </dl>
          <div className="release-links">
            <a href={release.deploymentUrl} target="_blank" rel="noreferrer">Production <ArrowIcon /></a>
            <a href={release.workflowUrl} target="_blank" rel="noreferrer">Workflow <ArrowIcon /></a>
          </div>
        </article>
        <div className="check-list" role="list">
          {release.checks.map((check) => (
            <article className="check-row" role="listitem" key={check.name}>
              <span className={`state-dot state-${check.state}`} aria-hidden="true" />
              <div>
                <h3>{check.name}</h3>
                <p>{check.summary}</p>
              </div>
              <strong>{check.state}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function App() {
  return (
    <>
      <a className="skip-link" href="#content">К содержанию</a>
      <div className="page-shell" id="top">
        <Header />
        <main id="content">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <span className="eyebrow">local-first AI product · Linux · Obsidian-synced docs</span>
              <h1 id="hero-title">LOCAL AI OS как продукт, а не набор скриптов.</h1>
              <p>Частный AI-контур с архитектурной картой, release pipeline, технической документацией, Obsidian sync и доказательной приёмкой.</p>
              <div className="hero-actions">
                <a className="button button-primary" href={TELEGRAM_URL} target="_blank" rel="noreferrer">Запустить диагностику <ArrowIcon /></a>
                <a className="button button-secondary" href="#technical">Техническая схема <ArrowIcon /></a>
              </div>
            </div>
            <div className="hero-console" aria-label="Ключевые product signals">
              <div><span>release</span><strong>visible</strong></div>
              <div><span>docs</span><strong>obsidian synced</strong></div>
              <div><span>runtime</span><strong>local-first</strong></div>
              <div><span>boundary</span><strong>no raw secrets</strong></div>
            </div>
          </section>

          <div className="facts" aria-label="Условия пилота">
            <div><span>Диагностика</span><strong>9 900 ₽</strong></div>
            <div><span>Пилот</span><strong>49 900 ₽</strong></div>
            <div><span>Срок</span><strong>5 рабочих дней</strong></div>
            <div><span>Контур</span><strong>до 3 проектов</strong></div>
          </div>

          <section className="architecture-section section" id="architecture" aria-labelledby="architecture-title">
            <div className="section-heading">
              <h2 id="architecture-title">Интерактивная архитектура.</h2>
              <p>Карта показывает не только runtime, но и source-of-truth, bootstrap, delivery contracts, Atlas visibility и release state.</p>
            </div>
            <ArchitectureExplorer />
          </section>

          <ReleasePanel />

          <section className="docs-section section" id="docs" aria-labelledby="docs-title">
            <div className="section-heading">
              <h2 id="docs-title">Документация синхронизируется с Obsidian.</h2>
              <p>Source docs лежат в репозитории, а `npm run docs:sync` публикует их в Obsidian product folder и tracked mirror.</p>
            </div>
            <div className="doc-grid">
              {docs.map(([title, text, path]) => (
                <article className="doc-card" key={path}>
                  <span>{path}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <ProductDetails />
          <section className="delivery-section section" id="delivery" aria-labelledby="delivery-title">
            <div className="section-heading">
              <h2 id="delivery-title">Автоматический pipeline поставки.</h2>
              <p>Каждое изменение проходит одинаковый путь: проверка оффера, build, release manifest, Pages deploy и документационный sync.</p>
            </div>
            <ol className="pipeline-list">
              {releasePipeline.map(([title, text], index) => (
                <li key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="acceptance-section section" id="acceptance" aria-labelledby="acceptance-title">
            <div className="section-heading acceptance-heading">
              <h2 id="acceptance-title">Приёмка по доказательствам.</h2>
              <p>Пилот считается готовым только когда есть проверяемые файлы, команды, статусы и ограничения.</p>
            </div>
            <div className="acceptance-table" role="list">
              {acceptance.map(([title, text], index) => (
                <div className="acceptance-row" role="listitem" key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <i><CheckIcon /></i>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <p className="boundary">Не обещаем полную автономию. Не копируем сырые диалоги. Не выносим секреты.</p>
          </section>

          <section className="contact-section" id="contact" aria-labelledby="contact-title">
            <h2 id="contact-title">Соберём вашу систему в один проверяемый контур.</h2>
            <a className="button button-primary" href={TELEGRAM_URL} target="_blank" rel="noreferrer">Запустить диагностику <ArrowIcon /></a>
            <div className="contact-links">
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">Telegram: @a1gorithms</a>
              <a href={EMAIL_URL}>actingsv@gmail.com</a>
            </div>
          </section>
        </main>
        <footer>
          <a className="wordmark" href="#top">LOCAL AI OS</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">Source repository <ArrowIcon /></a>
        </footer>
      </div>
    </>
  )
}

export default App
