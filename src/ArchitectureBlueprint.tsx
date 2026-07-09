import './architecture-blueprint.css'

const lanes = [
  {
    id: 'source',
    title: '01 Source of truth',
    role: 'Где живёт правда о системе',
    nodes: [
      ['obsidian', 'Obsidian vault', 'canonical decisions, architecture, roadmap, release memory'],
      ['github', 'GitHub repos', 'tracked code, docs, workflows, PR history'],
      ['bootstrap', 'system-bootstrap', 'restore notes, inventory, reproducible setup'],
    ],
  },
  {
    id: 'context',
    title: '02 Context layer',
    role: 'Как агент получает ограниченный контекст',
    nodes: [
      ['inventory', 'Context inventory', 'projects, files, notes, owners, freshness'],
      ['packs', 'Context packs', 'task-specific bundles instead of full-history reads'],
      ['rag', 'RAG / knowledge graph', 'retrieval, source notes, project memory'],
    ],
  },
  {
    id: 'runtime',
    title: '03 Runtime center',
    role: 'Где работают модели и интерфейсы',
    nodes: [
      ['ollama', 'Ollama', 'local model backend and compatible API'],
      ['webui', 'Open WebUI', 'primary local model UI and knowledge UX'],
      ['openclaw', 'OpenClaw / OpenHarness', 'guarded local tasks and terminal checks'],
    ],
  },
  {
    id: 'execution',
    title: '04 Execution layer',
    role: 'Как изменения проходят через проверки',
    nodes: [
      ['codex', 'Codex', 'foreground implementation and review executor'],
      ['orchestrator', 'codex-orchestrator', 'queues, bounded work items, run reports'],
      ['contracts', 'Run contracts', 'scope, commands, result, next action, evidence'],
    ],
  },
  {
    id: 'visibility',
    title: '05 Visibility / product',
    role: 'Что видит оператор и клиент',
    nodes: [
      ['atlas', 'Project Atlas', 'read-only cockpit: runs, repos, freshness, reliability'],
      ['site', 'Product page', 'public architecture, delivery, boundaries, releases'],
      ['pages', 'GitHub Pages', 'published build, release status, public docs'],
    ],
  },
]

const flows = [
  ['Obsidian', 'Context packs', 'safe canonical context'],
  ['Context packs', 'Local models', 'bounded task context'],
  ['Local models', 'Codex', 'planning / implementation support'],
  ['Codex', 'Run reports', 'verified result and next action'],
  ['Run reports', 'Project Atlas', 'operator status'],
  ['Run reports', 'Obsidian', 'post-run memory'],
  ['Obsidian', 'Product page', 'public documentation projection'],
  ['Product page', 'GitHub Pages', 'published product shell'],
]

const boundaries = [
  ['Public', 'product positioning, architecture map, delivery scope, release status, safety rules'],
  ['Internal', 'context packs, run reports, model routing, project state, recovery procedures'],
  ['Private', 'raw prompts, raw responses, auth files, cookies, .env, SSH/VPN/proxy credentials'],
]

const matrix = [
  ['Obsidian', 'source of truth', 'write canonical decisions', 'public projection only'],
  ['local-ai-os', 'product shell', 'publish architecture and docs', 'no private runtime data'],
  ['Project Atlas', 'cockpit', 'read status and reports', 'not source of truth'],
  ['Codex', 'execution', 'edit scoped code and produce reports', 'no unbounded system mutation'],
  ['Open WebUI / Ollama', 'model runtime', 'serve local model workflows', 'not product memory by itself'],
]

function ArchitectureBlueprint() {
  return (
    <section className="blueprint-section section" id="blueprint" aria-labelledby="blueprint-title">
      <div className="blueprint-heading">
        <span className="blueprint-kicker">architecture-blueprint://full-system</span>
        <h2 id="blueprint-title">Вся архитектура одним чертежом.</h2>
        <p>
          Это не лендинговая схема. Карта показывает, где лежит source of truth, как собирается контекст,
          где работают локальные модели, как Codex выполняет изменения, как Atlas показывает состояние и как
          публичная страница получает безопасную проекцию документации.
        </p>
      </div>

      <div className="blueprint-canvas" aria-label="Полная архитектурная карта LOCAL AI OS">
        {lanes.map((lane) => (
          <section className={`blueprint-lane lane-${lane.id}`} key={lane.id}>
            <header>
              <span>{lane.title}</span>
              <p>{lane.role}</p>
            </header>
            <div className="blueprint-nodes">
              {lane.nodes.map(([id, title, text]) => (
                <article className="blueprint-node" key={id}>
                  <span>{id}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flow-board" aria-label="Data and control flows">
        <div className="flow-title">
          <span className="blueprint-kicker">control/data flow</span>
          <h3>Основные потоки системы.</h3>
        </div>
        <ol>
          {flows.map(([from, to, label], index) => (
            <li key={`${from}-${to}`}>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <span>{from}</span>
              <i aria-hidden="true" />
              <span>{to}</span>
              <p>{label}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="boundary-board" aria-label="Public internal private boundary">
        {boundaries.map(([title, text]) => (
          <article key={title}>
            <span className="blueprint-kicker">{title.toLowerCase()} boundary</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <div className="role-matrix" aria-label="Component responsibility matrix">
        <div className="matrix-row matrix-head">
          <span>component</span>
          <span>role</span>
          <span>allowed</span>
          <span>boundary</span>
        </div>
        {matrix.map(([component, role, allowed, boundary]) => (
          <div className="matrix-row" key={component}>
            <strong>{component}</strong>
            <span>{role}</span>
            <span>{allowed}</span>
            <span>{boundary}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ArchitectureBlueprint
