import { useEffect, useMemo, useState } from 'react'
import './product-portal.css'

const TELEGRAM_URL = 'https://t.me/a1gorithms'
const EMAIL_URL = 'mailto:actingsv@gmail.com?subject=LOCAL%20AI%20OS%20—%20диагностика'

type ProductPage = {
  id: string
  nav: string
  title: string
  eyebrow: string
  lead: string
  thesis: string
  metrics: Array<[string, string]>
  sections: Array<{
    title: string
    body: string
    bullets: string[]
  }>
  cards: Array<[string, string]>
}

const pages: ProductPage[] = [
  {
    id: 'home',
    nav: 'Главная',
    eyebrow: 'private local-first AI operating system',
    title: 'LOCAL AI OS — продуктовый контур для управления сложной AI-системой.',
    lead: 'Не лендинг, не набор скриптов и не “ещё один чат”. Это многоуровневая система вокруг Obsidian, локальных моделей, Codex, Project Atlas, RAG, release pipeline и доказательной поставки.',
    thesis: 'Ценность продукта — управляемость: где живёт правда, как агент получает контекст, как меняется код, как проверяется результат, как оператор видит состояние, как релиз фиксируется обратно в память.',
    metrics: [['Пилот', '49 900 ₽'], ['Диагностика', '9 900 ₽'], ['Срок', '5 рабочих дней'], ['Scope', '1 Linux / 3 проекта']],
    sections: [
      {
        title: 'Позиционирование',
        body: 'LOCAL AI OS продаётся как инженерный AI-control tower для владельца сложной Linux-рабочей станции. Он нужен, когда ChatGPT, Codex, локальные модели, заметки и проекты уже есть, но между ними нет единой памяти, правил, проверок и релизного процесса.',
        bullets: [
          'Показывает систему как продукт, а не как экспериментальную папку скриптов.',
          'Собирает runtime, документацию, состояние, поставку и публичную презентацию в один контур.',
          'Оставляет клиенту не “настройки в голове исполнителя”, а runbook, карту, acceptance evidence и next increment.',
        ],
      },
      {
        title: 'Для кого',
        body: 'Для solo founder, инженера, маленькой команды или владельца локального AI-стека, которому нужно превратить хаотичный набор инструментов в поддерживаемый частный контур.',
        bullets: [
          'Есть несколько проектов и много исторического контекста.',
          'Есть локальные модели или желание держать sensitive context локально.',
          'Есть потребность в Codex/agent workflow, но без неконтролируемой автономии.',
        ],
      },
    ],
    cards: [
      ['Product portal', 'Многостраничное описание продукта, а не одна длинная рекламная полоса.'],
      ['Architecture blueprint', 'Чертёж слоёв, потоков, boundaries и ответственности компонентов.'],
      ['Release memory', 'Каждый релиз должен оставлять public note и Obsidian post-release память.'],
    ],
  },
  {
    id: 'architecture',
    nav: 'Архитектура',
    eyebrow: 'full system blueprint',
    title: 'Архитектура LOCAL AI OS: source of truth, context, runtime, execution, visibility.',
    lead: 'Система разделена на пять крупных плоскостей. Каждая плоскость имеет свою ответственность, входы, выходы и границы публикации.',
    thesis: 'Главный принцип: Obsidian — human source of truth; Atlas — read-only cockpit; Codex — controlled execution; product site — public projection; runtime не подменяет память.',
    metrics: [['Layers', '5'], ['Core nodes', '15+'], ['Public/private', 'separated'], ['Source', 'Obsidian']],
    sections: [
      {
        title: '01 Source of truth',
        body: 'Obsidian хранит решения, архитектуру, roadmap, product debt, post-release notes и канонические описания системы. GitHub хранит код, workflows, public docs и release artifacts. system-bootstrap хранит восстановление и inventory.',
        bullets: [
          'Obsidian выше generated files и runtime dashboards.',
          'GitHub не должен становиться заменой архитектурной памяти.',
          'Любая публичная документация — безопасная проекция, а не полный dump vault.',
        ],
      },
      {
        title: '02 Context layer',
        body: 'Context inventory и context packs превращают большой набор проектов, заметок и run reports в ограниченные task bundles. Агенту не нужно читать всё; он получает ровно то, что нужно для работы.',
        bullets: [
          'Контекст должен быть scope-specific.',
          'Generated summaries не должны быть выше canonical notes.',
          'Freshness и source attribution должны быть видимы оператору.',
        ],
      },
      {
        title: '03 Runtime center',
        body: 'Ollama, Open WebUI, OpenClaw и OpenHarness используются как локальные рабочие поверхности. Они дают модели, UI, guarded tasks и проверки, но не являются источником истины.',
        bullets: [
          'Ollama — модельный backend.',
          'Open WebUI — основной локальный UI и knowledge UX.',
          'OpenClaw/OpenHarness — controlled local task surfaces.',
        ],
      },
      {
        title: '04 Execution layer',
        body: 'Codex и codex-orchestrator отвечают за выполнение изменений. Их задача — работать по scope, оставлять run report, проходить verification и возвращать next action.',
        bullets: [
          'Никакого unrestricted shell как обещания продукта.',
          'Execution должен быть проверяемым: команды, diff, статус, known debt.',
          'Staged autonomy допускается только через sandbox, dry-run, gates и review.',
        ],
      },
      {
        title: '05 Visibility / product',
        body: 'Project Atlas показывает состояние системы: очереди, run reports, freshness, token waste, runtime exports и reliability. Product portal показывает внешнюю, безопасную и продаваемую архитектуру.',
        bullets: [
          'Atlas read-only, не source of truth.',
          'Product portal показывает клиенту карту продукта и поставки.',
          'GitHub Pages публикует проверенный build после QA.',
        ],
      },
    ],
    cards: [
      ['Obsidian', 'Canonical decisions and release memory.'],
      ['Context packs', 'Bounded task context for agents.'],
      ['Codex contracts', 'Scoped execution and verifiable reports.'],
      ['Atlas', 'Read-only operational cockpit.'],
    ],
  },
  {
    id: 'runtime',
    nav: 'Runtime',
    eyebrow: 'local model operating layer',
    title: 'Runtime не один сервис, а связка локальных поверхностей.',
    lead: 'В LOCAL AI OS runtime — это не просто Ollama. Это набор ролей: модельный backend, UI, knowledge surface, terminal checks, guarded actions и integration points.',
    thesis: 'Нельзя продавать “поставили локальную модель”. Продаётся управляемый runtime с понятными ролями, границами, health checks и fallback-политикой.',
    metrics: [['Ollama', 'models'], ['Open WebUI', 'UI/RAG'], ['OpenClaw', 'agents'], ['OpenHarness', 'checks']],
    sections: [
      {
        title: 'Ollama',
        body: 'Ollama держит локальные модели и API-совместимый слой. Его роль — обслуживать модельные запросы, а не хранить архитектуру продукта или память решений.',
        bullets: ['Model backend', 'OpenAI-compatible локальные сценарии', 'Роли моделей фиксируются отдельно в model routing map'],
      },
      {
        title: 'Open WebUI',
        body: 'Open WebUI — основной человеко-ориентированный интерфейс для локальных моделей и knowledge/RAG. Он удобен для общения, но не должен становиться единственной архитектурной памятью.',
        bullets: ['Knowledge UX', 'Локальный chat interface', 'Не заменяет Obsidian source of truth'],
      },
      {
        title: 'OpenClaw / OpenHarness',
        body: 'Эти слои нужны для controlled tasks: проверки, task execution surfaces, terminal-oriented flows, безопасная маршрутизация в локальном окружении.',
        bullets: ['Guarded actions', 'Terminal checks', 'No unrestricted command runner'],
      },
    ],
    cards: [['Health', 'Модели и сервисы должны иметь проверяемый статус.'], ['Fallback', 'При слабой локальной модели задача эскалируется.'], ['Routing', 'Каждая модель получает роль, а не произвольное использование.']],
  },
  {
    id: 'obsidian',
    nav: 'Obsidian/RAG',
    eyebrow: 'memory and retrieval system',
    title: 'Obsidian — мозг продукта, RAG — способ подавать релевантный контекст.',
    lead: 'Obsidian хранит смысл системы. RAG не должен быть кучей случайных чанков; он должен работать через canonical notes, context policy, freshness и public/private boundary.',
    thesis: 'Публичная страница и агенты должны строиться на безопасной проекции Obsidian, а не на raw dump всего vault.',
    metrics: [['Truth', 'canonical'], ['RAG', 'bounded'], ['Public', 'projection'], ['Private', 'sealed']],
    sections: [
      {
        title: 'Canonical notes',
        body: 'Канонические заметки описывают решения, архитектуру, текущие правила, поставку, release memory и product debt. Они имеют приоритет над generated summaries.',
        bullets: ['Decision notes', 'Architecture inventory', 'Release notes', 'Post-run memory'],
      },
      {
        title: 'Public projection',
        body: 'Product portal должен показывать не весь vault, а curated public snapshot: архитектура, поставка, безопасность, релизы и FAQ без приватных деталей.',
        bullets: ['Без raw prompts/responses', 'Без credentials/auth/cookies', 'Без private runtime logs'],
      },
      {
        title: 'Retrieval policy',
        body: 'RAG должен отвечать на вопрос: почему именно этот контекст попал в задачу, откуда он взят, насколько он свежий и можно ли ему доверять.',
        bullets: ['source attribution', 'freshness', 'scope relevance', 'human-readable trace'],
      },
    ],
    cards: [['Vault', 'Human-readable architecture memory.'], ['RAG', 'Context delivery layer.'], ['Snapshot', 'Safe public product projection.']],
  },
  {
    id: 'codex',
    nav: 'Codex',
    eyebrow: 'controlled execution layer',
    title: 'Codex — исполнитель, а не бесконтрольный агент.',
    lead: 'В продукте Codex должен работать по контракту: получить scope, использовать context pack, изменить код, запустить проверки, оставить отчёт и next action.',
    thesis: 'Главная проблема текущих agent workflows — хаотичность. LOCAL AI OS продаёт не “агент всё сделает”, а controlled execution pipeline.',
    metrics: [['Scope', 'required'], ['Reports', 'required'], ['Review', 'human'], ['Autonomy', 'staged']],
    sections: [
      {
        title: 'Work item contract',
        body: 'Каждая задача должна быть описана как work item: repo, branch, files, constraints, commands, expected output, boundaries, rollback.',
        bullets: ['repo/branch', 'allowed paths', 'verification commands', 'report format'],
      },
      {
        title: 'Run report',
        body: 'После работы Codex оставляет не болтовню, а нормализованный run report: что изменил, почему, чем проверил, что не смог, что делать дальше.',
        bullets: ['diff summary', 'checks status', 'known debt', 'next exact action'],
      },
      {
        title: 'Staged autonomy',
        body: 'Автономность допустима только как staged loop: plan, dry-run, sandbox, gate, review, manual apply или scoped apply.',
        bullets: ['dry-run first', 'sandbox copytree', 'kill switch', 'human review'],
      },
    ],
    cards: [['No chaos', 'No arbitrary command wandering.'], ['No fake autonomy', 'Claims must match gates.'], ['No silent failure', 'Every run produces evidence.']],
  },
  {
    id: 'atlas',
    nav: 'Atlas',
    eyebrow: 'operator cockpit',
    title: 'Project Atlas — read-only cockpit состояния AI-системы.',
    lead: 'Atlas должен отвечать на вопрос оператора: что сейчас происходит, что сломано, что устарело, где очередь, какие проверки прошли, что делать дальше.',
    thesis: 'Atlas не должен стать вторым source of truth. Он визуализирует состояние из reports, repos, queues и runtime snapshots.',
    metrics: [['Mode', 'read-only'], ['Shows', 'state'], ['Writes', 'none'], ['Truth', 'Obsidian']],
    sections: [
      {
        title: 'Mission Control',
        body: 'Atlas объединяет operational signals: repos, PRs, run reports, local model status, queue, token waste, freshness, broken checks.',
        bullets: ['repo status', 'run history', 'queue health', 'model/runtime status'],
      },
      {
        title: 'Evidence cards',
        body: 'Для продукта важно показывать evidence: какие проверки прошли, где файл отчёта, какой release, какая версия документации, какой next action.',
        bullets: ['checks', 'artifacts', 'timestamps', 'owner-visible summaries'],
      },
      {
        title: 'Boundary',
        body: 'Atlas показывает состояние, но не хранит первичные решения. Любая canonical правка возвращается в Obsidian или GitHub-tracked docs.',
        bullets: ['read-only cockpit', 'no raw secrets', 'no truth duplication'],
      },
    ],
    cards: [['State', 'Operator sees system health.'], ['Evidence', 'Acceptance and run reports are visible.'], ['Boundary', 'No second source of truth.']],
  },
  {
    id: 'delivery',
    nav: 'Поставка',
    eyebrow: 'commercial pilot package',
    title: 'Поставка должна выглядеть как продукт за серьёзные деньги.',
    lead: 'Клиент платит не за “настроили модель”. Он получает диагностику, архитектуру, runbook, routing, memory policy, monitoring surface, restore checklist, acceptance report и roadmap.',
    thesis: 'Пилот 49 900 ₽ должен быть оформлен как repeatable delivery package, а не как индивидуальная импровизация.',
    metrics: [['Diagnostic', '9 900 ₽'], ['Pilot', '49 900 ₽'], ['Time', '5 дней'], ['Projects', 'до 3']],
    sections: [
      {
        title: 'Day 1 — диагностика',
        body: 'Сбор текущего состояния: проекты, заметки, модели, runtime, риски, публичные/приватные границы, recovery gaps.',
        bullets: ['inventory', 'risk map', 'scope lock', 'acceptance plan'],
      },
      {
        title: 'Day 2 — контекст и память',
        body: 'Настройка Obsidian/source-of-truth, context policy, RAG boundary, public/private classification.',
        bullets: ['canonical notes', 'context packs', 'RAG policy', 'public projection'],
      },
      {
        title: 'Day 3 — runtime и execution',
        body: 'Модельные роли, Open WebUI/Ollama/OpenClaw surfaces, Codex task contract, run report format.',
        bullets: ['model routing', 'runtime checks', 'Codex contract', 'run reports'],
      },
      {
        title: 'Day 4 — безопасность и recovery',
        body: 'Секреты, boundaries, no-raw-data policy, backup and restore dry-run, failure modes.',
        bullets: ['secret boundary', 'restore dry-run', 'rollback notes', 'known debt'],
      },
      {
        title: 'Day 5 — приёмка',
        body: 'Финальная проверка, acceptance report, handoff, roadmap, следующий product increment.',
        bullets: ['acceptance report', 'operator handoff', 'release note', 'next increment'],
      },
    ],
    cards: [['Architecture map', 'Full system map.'], ['Runbook', 'How to operate.'], ['Acceptance', 'Evidence of delivery.']],
  },
  {
    id: 'security',
    nav: 'Безопасность',
    eyebrow: 'private by design',
    title: 'Безопасность — не сноска, а основа позиционирования.',
    lead: 'LOCAL AI OS должен честно показывать, что публикуется, что остаётся внутренним, что никогда не выходит наружу и почему unrestricted autonomy недопустима.',
    thesis: 'Приватность продаётся только тогда, когда есть техническая дисциплина: boundaries, allowlists, audit, dry-run, kill switch и понятная классификация данных.',
    metrics: [['Public', 'safe docs'], ['Internal', 'reports'], ['Private', 'sealed'], ['Shell', 'guarded']],
    sections: [
      {
        title: 'Public boundary',
        body: 'Публично показываются только продуктовая архитектура, delivery model, safety rules, release process, roadmap, FAQ и безопасные технические схемы.',
        bullets: ['architecture', 'delivery', 'boundaries', 'release notes'],
      },
      {
        title: 'Internal boundary',
        body: 'Внутри остаются context packs, run reports, routing maps, recovery details и operational status. Это может быть видно владельцу, но не обязательно публично.',
        bullets: ['context packs', 'run reports', 'model routing', 'recovery procedures'],
      },
      {
        title: 'Private boundary',
        body: 'Не публикуются raw prompts, raw responses, private transcripts, auth files, cookies, secrets, SSH/VPN/proxy credentials, environment files и приватные runtime logs.',
        bullets: ['no raw dialogs', 'no credentials', 'no auth/cookies', 'no private logs'],
      },
    ],
    cards: [['Allowlist', 'External bridges only by rules.'], ['Audit', 'Actions must be traceable.'], ['Kill switch', 'Controlled shutdown path.']],
  },
  {
    id: 'releases',
    nav: 'Релизы',
    eyebrow: 'release train and product memory',
    title: 'Релизы связывают код, сайт, документацию и Obsidian-память.',
    lead: 'LOCAL AI OS должен развиваться через release train: decision, docs, UI, QA, build, deploy, tag, release note, post-release memory.',
    thesis: 'Без релизного процесса продукт снова развалится на набор несвязанных заметок и патчей.',
    metrics: [['Decision', 'Obsidian'], ['QA', 'required'], ['Deploy', 'Pages'], ['Memory', 'post-release']],
    sections: [
      {
        title: 'Pre-release',
        body: 'Любое изменение начинается с решения: зачем, что меняется, какие boundaries, что считается готовым, что не входит.',
        bullets: ['decision note', 'scope', 'risk', 'acceptance criteria'],
      },
      {
        title: 'Build and QA',
        body: 'Product repo проверяет offer invariants, docs completeness, forbidden content, lint, build, audit and release manifest.',
        bullets: ['npm run qa', 'docs drift check', 'build', 'audit'],
      },
      {
        title: 'Post-release',
        body: 'После публикации результат фиксируется в Obsidian: версия, commit, что изменилось, что не успели, следующий точный increment.',
        bullets: ['release note', 'Obsidian memory', 'known debt', 'next increment'],
      },
    ],
    cards: [['product-v*', 'Version tags.'], ['GitHub Pages', 'Public build.'], ['Obsidian', 'Post-release memory.']],
  },
  {
    id: 'roadmap',
    nav: 'Roadmap',
    eyebrow: 'commercial product roadmap',
    title: 'Roadmap превращает систему в повторяемый продукт.',
    lead: 'Система должна расти не хаотично, а по продуктовым версиям: portal, docs snapshot, Atlas evidence, installer, customer pilot package, managed local AI workspace.',
    thesis: 'Каждый следующий релиз должен усиливать продаваемость, воспроизводимость и проверяемость поставки.',
    metrics: [['v0.1', 'portal'], ['v0.2', 'docs sync'], ['v0.3', 'evidence'], ['v1.0', 'repeatable']],
    sections: [
      {
        title: 'v0.1 — Product portal',
        body: 'Многостраничный сайт: позиционирование, архитектура, runtime, Obsidian, Codex, Atlas, поставка, безопасность, релизы, FAQ.',
        bullets: ['multi-page UX', 'visual architecture', 'commercial delivery package'],
      },
      {
        title: 'v0.2 — Obsidian-derived docs',
        body: 'Генератор public docs snapshot из docs/product и Obsidian-derived notes. Drift check, manifest, forbidden content scanner.',
        bullets: ['docs/product tree', 'snapshot generator', 'drift checks'],
      },
      {
        title: 'v0.3 — Atlas evidence layer',
        body: 'Публично безопасные evidence cards: что проверено, какой release, какие artifacts, какие blockers.',
        bullets: ['acceptance cards', 'runtime status', 'release status'],
      },
      {
        title: 'v1.0 — Repeatable delivery',
        body: 'Повторяемая коммерческая поставка для клиентов: diagnostic, pilot, handoff, acceptance, roadmap.',
        bullets: ['delivery template', 'pricing package', 'client handoff'],
      },
    ],
    cards: [['Now', 'Product portal.'], ['Next', 'Docs generator.'], ['Later', 'Repeatable install package.']],
  },
  {
    id: 'faq',
    nav: 'FAQ',
    eyebrow: 'buyer and operator questions',
    title: 'FAQ должно закрывать сомнения без личного созвона.',
    lead: 'Страница должна объяснять, почему продукт стоит денег, чем он отличается от обычных AI-инструментов и что именно получает клиент.',
    thesis: 'Сильный продукт отвечает на неудобные вопросы прямо: что входит, что не входит, где приватность, где границы автономии, зачем Obsidian.',
    metrics: [['Questions', '12+'], ['Tone', 'technical'], ['Claims', 'bounded'], ['Offer', 'clear']],
    sections: [
      {
        title: 'Это просто Open WebUI?',
        body: 'Нет. Open WebUI — одна поверхность runtime. Продукт включает source-of-truth, context policy, model routing, execution contracts, Atlas visibility, release pipeline и acceptance.',
        bullets: ['Open WebUI is a layer', 'LOCAL AI OS is an operating contour', 'Value is integration and control'],
      },
      {
        title: 'Это автономный агент?',
        body: 'Нет как безусловное обещание. Продукт поддерживает staged autonomy: dry-run, sandbox, gates, reports, human review. Полная автономия без контроля не продаётся.',
        bullets: ['controlled execution', 'human review', 'no fake autonomy'],
      },
      {
        title: 'Почему это стоит 49 900 ₽?',
        body: 'Потому что клиент получает не установку одной модели, а рабочий контур: диагностика, архитектура, memory/RAG policy, runtime checks, Codex workflow, Atlas visibility, recovery, acceptance report.',
        bullets: ['repeatable pilot', 'technical artifacts', 'operator handoff'],
      },
    ],
    cards: [['What is included', 'Architecture, runtime, docs, acceptance.'], ['What is not', 'Magic autonomy, secret leakage, unrestricted shell.'], ['Why now', 'Local AI stacks need operating discipline.']],
  },
]

const defaultPage = pages[0]

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" />
    </svg>
  )
}

function getRoute() {
  const raw = window.location.hash.replace('#/', '').replace('#', '')
  return raw || 'home'
}

function ProductPortal() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const onHash = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const page = useMemo(() => pages.find((item) => item.id === route) ?? defaultPage, [route])

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <a className="portal-mark" href="#/home">LOCAL AI OS</a>
        <nav aria-label="Product pages">
          {pages.map((item) => (
            <a className={item.id === page.id ? 'is-active' : ''} href={`#/${item.id}`} key={item.id}>{item.nav}</a>
          ))}
        </nav>
        <a className="portal-cta" href={TELEGRAM_URL} target="_blank" rel="noreferrer">Диагностика <ArrowIcon /></a>
      </header>

      <main className="portal-main">
        <aside className="portal-sidebar" aria-label="Product navigation">
          <span>product portal</span>
          {pages.map((item, index) => (
            <a className={item.id === page.id ? 'is-active' : ''} href={`#/${item.id}`} key={item.id}>
              <strong>{String(index).padStart(2, '0')}</strong>
              {item.nav}
            </a>
          ))}
        </aside>

        <section className="portal-page" aria-labelledby="portal-title">
          <div className="portal-hero">
            <span className="portal-eyebrow">{page.eyebrow}</span>
            <h1 id="portal-title">{page.title}</h1>
            <p>{page.lead}</p>
          </div>

          <div className="portal-metrics" aria-label="Product facts">
            {page.metrics.map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>

          <section className="portal-thesis">
            <span>core thesis</span>
            <p>{page.thesis}</p>
          </section>

          {page.id === 'architecture' && <ArchitectureMap />}

          <div className="portal-content-grid">
            {page.sections.map((section, index) => (
              <article className="portal-doc-block" key={section.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
                <ul>
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              </article>
            ))}
          </div>

          <div className="portal-card-grid">
            {page.cards.map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <footer className="portal-page-footer">
            <a href={`#/${nextPage(page.id)}`}>Следующая страница <ArrowIcon /></a>
            <a href={EMAIL_URL}>actingsv@gmail.com</a>
          </footer>
        </section>
      </main>
    </div>
  )
}

function nextPage(current: string) {
  const index = pages.findIndex((item) => item.id === current)
  return pages[(index + 1) % pages.length].id
}

function ArchitectureMap() {
  const lanes = [
    ['01', 'Source of truth', ['Obsidian vault', 'GitHub repos', 'system-bootstrap']],
    ['02', 'Context layer', ['Context inventory', 'Context packs', 'RAG / knowledge graph']],
    ['03', 'Runtime center', ['Ollama', 'Open WebUI', 'OpenClaw / OpenHarness']],
    ['04', 'Execution layer', ['Codex', 'codex-orchestrator', 'Run contracts']],
    ['05', 'Visibility layer', ['Project Atlas', 'Product portal', 'GitHub Pages']],
  ]

  const flows = [
    'Obsidian → Context packs → Local models → Codex → Run reports',
    'Run reports → Project Atlas → Operator decision',
    'Run reports → Obsidian → Product docs snapshot → Product portal',
    'Product portal → QA → GitHub Pages → public release',
  ]

  return (
    <section className="portal-architecture-map" aria-label="Full architecture map">
      <div className="portal-lanes">
        {lanes.map(([number, title, nodes]) => (
          <article key={title}>
            <span>{number}</span>
            <h2>{title}</h2>
            <div>
              {(nodes as string[]).map((node) => <strong key={node}>{node}</strong>)}
            </div>
          </article>
        ))}
      </div>
      <ol className="portal-flows">
        {flows.map((flow, index) => (
          <li key={flow}><span>{String(index + 1).padStart(2, '0')}</span>{flow}</li>
        ))}
      </ol>
    </section>
  )
}

export default ProductPortal
