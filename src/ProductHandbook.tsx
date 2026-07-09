import './product-handbook.css'

const handbookSections = [
  {
    id: 'overview',
    tag: '00 / overview',
    title: 'Что такое LOCAL AI OS',
    summary: 'Частный ИИ-контур на Linux-машине, который собирает локальные модели, Obsidian, Codex, Project Atlas, RAG и отчёты выполнения в одну управляемую систему.',
    points: [
      'Система не заменяет ChatGPT, Ollama или Open WebUI. Она связывает их в рабочий контур с памятью, правилами, проверками и релизами.',
      'Главная ценность — не запуск модели, а управляемость: где лежит знание, как агент получает контекст, как проверяется результат и где фиксируется следующий шаг.',
      'Продукт рассчитан на владельца сложной локальной рабочей станции, где много проектов, заметок, скриптов, моделей и технических решений.',
    ],
  },
  {
    id: 'architecture',
    tag: '01 / architecture',
    title: 'Архитектура системы',
    summary: 'LOCAL AI OS строится вокруг Obsidian как source of truth, публичного product snapshot, локального runtime, Codex execution layer и Project Atlas cockpit.',
    points: [
      'Obsidian хранит канонические решения, архитектурные заметки, ограничения, roadmap и post-release память.',
      'Контекстный слой превращает большие заметки и репозитории в task-specific context packs, чтобы агент не перечитывал всё заново.',
      'Execution layer отделён от source of truth: Codex выполняет изменения, run reports нормализуют результат, Atlas показывает состояние, но не становится источником истины.',
    ],
  },
  {
    id: 'runtime',
    tag: '02 / runtime',
    title: 'Runtime-слои',
    summary: 'В системе есть несколько рабочих поверхностей: Ollama, Open WebUI, OpenClaw, OpenHarness, Codex, codex-orchestrator, Project Atlas и public product shell.',
    points: [
      'Ollama — backend локальных моделей и OpenAI-compatible API для локальных сценариев.',
      'Open WebUI — пользовательский интерфейс для локального общения, knowledge/RAG и model UX.',
      'OpenClaw и OpenHarness — контролируемые runtime-поверхности для локальных задач, Telegram/project-agent маршрутов и терминальных проверок.',
      'Codex и codex-orchestrator — слой управляемого исполнения: очередь, bounded tasks, verification commands, shared run reports.',
    ],
  },
  {
    id: 'obsidian',
    tag: '03 / obsidian-rag',
    title: 'Obsidian, RAG и память',
    summary: 'Obsidian не просто база заметок. Это долговременная память решений, карта архитектуры, журнал релизов и источник публичного product snapshot.',
    points: [
      'Публичная страница не должна быть ручным рекламным текстом. Она должна отражать безопасную public projection из Obsidian-derived документации.',
      'RAG-слой нужен не для магии, а для подачи релевантного контекста: архитектура, текущие цели, политики, backlog, run reports, known debt.',
      'Private/raw данные не попадают в публичный snapshot: секреты, raw prompts, raw responses, приватные логи, auth files и credentials запрещены.',
    ],
  },
  {
    id: 'codex',
    tag: '04 / codex-layer',
    title: 'Codex и исполнение задач',
    summary: 'Codex не должен хаотично ходить по системе. Он получает ограниченную задачу, контекст, правила, verification и обязан оставить нормальный отчёт.',
    points: [
      'Каждая задача должна иметь scope: какой репозиторий, какие файлы, какие проверки, какой результат считается готовым.',
      'Результат работы должен превращаться в run report: что изменено, чем проверено, что осталось, какой следующий точный шаг.',
      'Это ещё не полная автономия. Автономные dry-run/worker сценарии допустимы только через sandbox, gates, review и safe apply.',
    ],
  },
  {
    id: 'atlas',
    tag: '05 / atlas-cockpit',
    title: 'Project Atlas как cockpit',
    summary: 'Atlas — это read-only Mission Control: состояние проектов, очереди, отчёты, freshness, token waste, model routing и reliability.',
    points: [
      'Atlas должен показывать состояние, но не становиться новым source of truth.',
      'Его роль — дать оператору одну панель: что сломано, что устарело, какие задачи в очереди, какие проверки прошли.',
      'Product page показывает этот слой как часть поставки: клиент понимает, что получает не набор скриптов, а cockpit управления системой.',
    ],
  },
  {
    id: 'delivery',
    tag: '06 / delivery',
    title: 'Поставка и пилот',
    summary: 'Пилот — это не “поставить нейронку”. Это 5 рабочих дней по сборке контура: диагностика, контекст, память, мониторинг, восстановление и приёмка.',
    points: [
      'День 1: аудит машины, проектов, рисков и текущего хаоса.',
      'День 2: карта источников, Obsidian/source-of-truth, context policy и routing.',
      'День 3: RAG/memory, runtime status, model roles, базовая наблюдаемость.',
      'День 4: recovery, безопасность, приватные границы, restore dry-run.',
      'День 5: acceptance report, runbook, known debt, next product increment.',
    ],
  },
  {
    id: 'security',
    tag: '07 / safety',
    title: 'Границы безопасности',
    summary: 'LOCAL AI OS продаётся как private/local-first система. Поэтому публичный продукт обязан честно отделять архитектуру от приватных данных.',
    points: [
      'Запрещено публиковать .env, auth.json, cookies, sessionid, SSH/VPN/proxy credentials, raw prompts, raw responses, private transcripts и runtime logs.',
      'Запрещён unrestricted shell как публичное обещание или скрытый механизм.',
      'Любой внешний мост должен иметь allowlist, audit, dry-run режим и понятный kill switch.',
    ],
  },
  {
    id: 'release',
    tag: '08 / release-train',
    title: 'Release pipeline',
    summary: 'Каждый релиз должен связывать Obsidian decision, public docs snapshot, UI, QA, Pages deploy и post-release note.',
    points: [
      'Релиз начинается с Obsidian decision: что меняем, зачем, какие границы не трогаем.',
      'Затем обновляется public docs snapshot и UI, после чего QA проверяет offer, docs completeness, forbidden content, build и audit.',
      'После merge создаётся release note/tag, сайт публикуется через GitHub Pages, а результат возвращается в Obsidian как post-release memory.',
    ],
  },
]

const architectureNodes = [
  ['truth', 'Obsidian', 'source of truth: решения, архитектура, релизы, долг'],
  ['context', 'Context/RAG', 'task packs, retrieval, knowledge graph, context budgets'],
  ['models', 'Local models', 'role routing: draft, coding, planning, embeddings, vision'],
  ['runtime', 'Runtime UI', 'Ollama, Open WebUI, OpenClaw, OpenHarness'],
  ['exec', 'Codex', 'bounded execution, queue, verification, reports'],
  ['atlas', 'Project Atlas', 'read-only cockpit, status, runs, freshness, reliability'],
  ['site', 'Product site', 'public snapshot, docs, release story, customer handoff'],
]

const evidenceItems = [
  ['Architecture map', 'Полная схема слоёв, ownership и data flow.'],
  ['Technical runbook', 'Команды запуска, проверки, обновления, отката.'],
  ['Context policy', 'Что считается source, generated, private, public.'],
  ['Model routing map', 'Какая модель для какой роли и когда нужна эскалация.'],
  ['Restore checklist', 'Как восстановить систему и проверить dry-run.'],
  ['Acceptance report', 'Факты поставки: что проверено, что ограничено, что дальше.'],
]

const releaseSteps = [
  ['decision', 'Obsidian decision', 'Фиксируем цель, границы, риск и критерий готовности.'],
  ['snapshot', 'Public docs snapshot', 'Обновляем безопасную продуктовую проекцию без приватных данных.'],
  ['ui', 'Product UI', 'Сайт показывает архитектуру, поставку, безопасность и релизный процесс.'],
  ['qa', 'QA gates', 'Docs completeness, forbidden content, offer invariants, build, audit.'],
  ['deploy', 'Pages deploy', 'Публикация dist через GitHub Actions.'],
  ['memory', 'Post-release memory', 'Итог релиза возвращается в Obsidian и backlog.'],
]

const faq = [
  ['Это просто Open WebUI?', 'Нет. Open WebUI — только одна runtime-поверхность. LOCAL AI OS связывает UI, Obsidian, RAG, Codex, Atlas, проверки, релизы и восстановление.'],
  ['Это автономный агент?', 'Нет в полном смысле. Продукт честно отделяет controlled execution и staged autonomy. Автономные сценарии возможны только через dry-run, sandbox, gates и review.'],
  ['Что получает клиент?', 'Не “установленную нейронку”, а карту системы, runbook, routing, RAG/memory policy, мониторинг, restore checklist, acceptance report и следующий план развития.'],
  ['Почему нужен Obsidian?', 'Потому что сложная система должна иметь человеко-читаемый source of truth. Без него сайт, агенты и скрипты быстро расходятся.'],
  ['Почему это private/local-first?', 'Потому что многие данные нельзя отдавать наружу. Система проектируется так, чтобы публичная документация отделялась от приватного runtime и секретов.'],
]

function ProductHandbook() {
  return (
    <section className="handbook-section section" id="handbook" aria-labelledby="handbook-title">
      <div className="handbook-hero">
        <span className="doc-mono-tag">product-handbook://local-ai-os</span>
        <h2 id="handbook-title">Технический продукт, а не лендинг.</h2>
        <p>
          LOCAL AI OS должен объясняться как инженерная система: source of truth, runtime, память,
          исполнение задач, наблюдаемость, безопасность, релизы и поставка. Этот раздел — публичный
          handbook прямо внутри продуктовой страницы.
        </p>
      </div>

      <div className="product-map" aria-label="LOCAL AI OS architecture map">
        {architectureNodes.map(([id, title, text], index) => (
          <article className="product-map-node" key={id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <div className="docs-layout">
        <aside className="docs-sidebar" aria-label="Разделы документации">
          <span className="doc-mono-tag">docs index</span>
          {handbookSections.map((section) => (
            <a href={`#doc-${section.id}`} key={section.id}>{section.title}</a>
          ))}
        </aside>

        <div className="docs-panel">
          {handbookSections.map((section) => (
            <article className="docs-section-card" id={`doc-${section.id}`} key={section.id}>
              <span className="doc-status-pill">{section.tag}</span>
              <h3>{section.title}</h3>
              <p>{section.summary}</p>
              <ul>
                {section.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className="sync-contract" id="obsidian-sync">
        <div>
          <span className="doc-mono-tag">obsidian → public snapshot → site</span>
          <h3>Связь с Obsidian должна быть видимой.</h3>
        </div>
        <p>
          Obsidian остаётся source of truth. Product repo хранит публичную проекцию: безопасные разделы,
          которые можно показывать клиенту. После каждого релиза результат должен возвращаться в Obsidian
          как post-release note: что изменено, чем проверено, какой следующий increment.
        </p>
      </div>

      <div className="evidence-block" id="evidence">
        <div className="section-heading">
          <h2>Что должно оставаться у клиента.</h2>
          <p>Поставка измеряется артефактами, а не обещаниями. Каждый пункт должен быть проверяемым.</p>
        </div>
        <div className="evidence-grid">
          {evidenceItems.map(([title, text], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="release-train-large" id="release-handbook">
        <div className="section-heading">
          <h2>Релизный поезд продукта.</h2>
          <p>LOCAL AI OS должен развиваться через один и тот же проверяемый маршрут.</p>
        </div>
        <ol>
          {releaseSteps.map(([phase, title, text], index) => (
            <li key={phase}>
              <span>{phase}</span>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </div>

      <div className="boundary-grid" id="boundaries">
        <article>
          <span className="doc-mono-tag">do not publish</span>
          <h3>Private boundary</h3>
          <p>.env, auth.json, cookies, sessionid, SSH/VPN/proxy credentials, raw prompts, raw responses, private transcripts, runtime logs.</p>
        </article>
        <article>
          <span className="doc-mono-tag">do not promise</span>
          <h3>No fake autonomy</h3>
          <p>Нельзя продавать магического автономного агента. Только controlled execution, dry-run, sandbox, verification и human review.</p>
        </article>
        <article>
          <span className="doc-mono-tag">do not duplicate</span>
          <h3>No second runtime center</h3>
          <p>Open WebUI, Ollama, OpenClaw, Codex и Atlas уже имеют роли. Новый центр допустим только при доказанной необходимости.</p>
        </article>
      </div>

      <div className="faq-list" id="faq">
        <div className="section-heading">
          <h2>FAQ для первого знакомства.</h2>
          <p>Короткие ответы на вопросы, которые должен закрывать сайт без личного объяснения владельца.</p>
        </div>
        {faq.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default ProductHandbook
