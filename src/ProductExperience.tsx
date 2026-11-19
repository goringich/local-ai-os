import { useState } from 'react'
import './product-experience.css'

type Scenario = {
  id: string
  label: string
  subtitle: string
  request: string
  objective: string
  sources: Array<{ name: string; reason: string; tag: string }>
  excluded: string[]
  boundary: string
  evidence: string[]
  outcome: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'resume',
    label: 'Вернуть контекст',
    subtitle: 'Разработка после перерыва',
    request: 'Продолжи разработку проекта. Не повторяй прошлые неудачные решения.',
    objective: 'Восстановить последнее подтверждённое состояние и определить следующий безопасный шаг.',
    sources: [
      { name: 'Project goal / decisions', reason: 'Цель и принятые решения', tag: 'CANONICAL' },
      { name: 'Git: current revision', reason: 'Актуальный код, а не пересказ чата', tag: 'FRESH SOURCE' },
      { name: 'Mission checkpoint', reason: 'Последняя попытка и оставшийся blocker', tag: 'CONTINUITY' },
    ],
    excluded: ['Сырые переписки', 'Устаревшие summaries', 'Секреты и чужие проекты'],
    boundary: 'Только выбранный проект; сначала чтение, затем отдельный допуск на запись.',
    evidence: ['Соответствие текущему Git SHA', 'Актуальность checkpoint', 'Следующий шаг с источником'],
    outcome: 'Краткая карточка состояния, история решений, конкретный следующий шаг.',
  },
  {
    id: 'fix',
    label: 'Исправить дефект',
    subtitle: 'Код и проверяемая поставка',
    request: 'Исправь регрессию. Не считай зелёный тест доказательством исправления на сервере.',
    objective: 'Связать исправление с задачей, тестами и отдельно проверяемым релизом.',
    sources: [
      { name: 'Issue + reproducer', reason: 'Чёткий симптом и критерий исправления', tag: 'TASK' },
      { name: 'Git: source + tests', reason: 'Точный репозиторий и версия кода', tag: 'FRESH SOURCE' },
      { name: 'Prior failed attempt', reason: 'Известная причина неудачного подхода', tag: 'EXPERIENCE' },
    ],
    excluded: ['Случайные репозитории', 'Непроверенные советы', 'Продакшен-секреты'],
    boundary: 'Запись только в изолированную рабочую ветку; merge и deploy отдельно.',
    evidence: ['Репродукция до исправления', 'Тесты для exact commit', 'Отдельное подтверждение deploy'],
    outcome: 'Изменение с тестами и отчётом: что доказано, а что ещё требует live-проверки.',
  },
  {
    id: 'privacy',
    label: 'Защитить проект',
    subtitle: 'Приватный контекст и контроль',
    request: 'Подготовь AI к работе, но не показывай ему данные соседнего клиента.',
    objective: 'Собрать полезный контекст, не открывая запрещённые источники.',
    sources: [
      { name: 'Project ownership policy', reason: 'Где разрешено читать и писать', tag: 'AUTHORITY' },
      { name: 'Safe source inventory', reason: 'Одобренные файлы текущего проекта', tag: 'ALLOWLIST' },
      { name: 'Context budget', reason: 'Достаточный, но ограниченный пакет', tag: 'CONTEXT' },
    ],
    excluded: ['Каталоги других клиентов', 'Токены и cookies', 'Неограниченный home-directory crawl'],
    boundary: 'Fail-closed: неизвестный источник блокируется до чтения.',
    evidence: ['Scope-фильтрация', 'Redaction policy', 'Отсутствие доступа к запрещённому пути'],
    outcome: 'Контекст-пакет с provenance и перечнем отклонённых источников.',
  },
]

const STAGES = [
  ['01', 'Задача'],
  ['02', 'Контекст'],
  ['03', 'Допуск'],
  ['04', 'Исполнение'],
  ['05', 'Проверка'],
  ['06', 'Отчёт'],
] as const

export function DemoStudio({ compact = false }: { compact?: boolean }) {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [stage, setStage] = useState(0)
  const [violateScope, setViolateScope] = useState(false)
  const [evaluated, setEvaluated] = useState(false)
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0]
  const blocked = violateScope
  const verdict = !evaluated ? 'ОЖИДАЕТ ПРОВЕРКИ' : blocked ? 'BLOCKED · POLICY' : 'SIMULATED CHECKS PASS'

  function chooseScenario(id: string) {
    setScenarioId(id)
    setStage(0)
    setViolateScope(false)
    setEvaluated(false)
  }

  function changeBoundary(value: boolean) {
    setViolateScope(value)
    setEvaluated(false)
  }

  function advance() {
    setStage((current) => Math.min(current + 1, STAGES.length - 1))
  }

  return <section className={'exp-simulator ' + (compact ? 'exp-simulator-compact' : '')} aria-label="Интерактивный демонстратор логики LOCAL AI OS">
    <div className="exp-simulator-heading">
      <div>
        <div className="exp-overline">SANDBOX / INTERACTIVE WALKTHROUGH</div>
        <h2>Не просто посмотреть. <em>Пройти через работу системы.</em></h2>
        <p>Выбери задачу, исследуй источники и попробуй нарушить ограничения. Результат зависит от твоих действий.</p>
      </div>
      <span className="exp-synthetic"><span aria-hidden="true">●</span> СИМУЛЯЦИЯ · БЕЗ ДОСТУПА К ПРОЕКТАМ</span>
    </div>

    <div className="exp-scenario-switch" role="group" aria-label="Выбор примера">
      {SCENARIOS.map((item, index) => <button type="button" key={item.id} aria-pressed={item.id === scenarioId} onClick={() => chooseScenario(item.id)} className={item.id === scenarioId ? 'exp-selected' : ''}>
        <span>0{index + 1} / {item.subtitle}</span>
        <strong>{item.label}</strong>
      </button>)}
    </div>

    <div className="exp-workbench">
      <aside className="exp-workbench-side">
        <div className="exp-panel-head"><span className="exp-signal" /> PROJECT BRIEF <span className="exp-panel-index">EXAMPLE.001</span></div>
        <div className="exp-brief-body">
          <span className="exp-overline">ЗАПРОС ВЛАДЕЛЬЦА</span>
          <blockquote>«{scenario.request}»</blockquote>
          <div className="exp-sidebar-divider" />
          <span className="exp-overline">КРИТЕРИЙ УСПЕХА</span>
          <p>{scenario.objective}</p>
          <div className="exp-sidebar-divider" />
          <span className="exp-overline">СОСТОЯНИЕ СЦЕНАРИЯ</span>
          <div className="exp-status-line"><span>Модель</span><strong>сменный исполнитель</strong></div>
          <div className="exp-status-line"><span>Доступ</span><strong>{blocked ? 'запрос отклонён' : 'ограничен'}</strong></div>
          <div className="exp-status-line"><span>Evidence</span><strong>{verdict}</strong></div>
        </div>
      </aside>

      <div className="exp-main-panel">
        <div className="exp-panel-head"><span>WORKFLOW EXPLORER</span><span className="exp-panel-index">НЕ LIVE TELEMETRY</span></div>
        <div className="exp-stage-track" role="group" aria-label="Этапы работы">
          {STAGES.map(([number, name], index) => <button type="button" key={number} className={stage === index ? 'exp-active-stage' : ''} aria-current={stage === index ? 'step' : undefined} onClick={() => setStage(index)}>
            <span>{number}</span>{name}
          </button>)}
        </div>
        <div className="exp-stage-body" aria-live="polite">
          {stage === 0 && <>
            <span className="exp-overline">INTENT → OUTCOME CONTRACT</span>
            <h3>Работа начинается с результата, не с промпта.</h3>
            <p>Сначала фиксируется ожидаемое поведение, границы проекта и условие завершения. История чата не заменяет эти данные.</p>
            <div className="exp-code-lines">
              <div><span>mission</span><strong>{scenario.label}</strong></div>
              <div><span>scope</span><strong>один разрешённый проект</strong></div>
              <div><span>success</span><strong>критерий + проверяемое evidence</strong></div>
            </div>
          </>}
          {stage === 1 && <>
            <span className="exp-overline">CONTEXT COMPILER / PROVENANCE</span>
            <h3>Отбираем источники по роли и актуальности.</h3>
            <p>Эти условные записи иллюстрируют фильтры реальной архитектуры: ownership, authority, freshness и ограничение контекстного бюджета.</p>
            <div className="exp-source-list">{scenario.sources.map((source) => <div key={source.name}><div><strong>{source.name}</strong><small>{source.reason}</small></div><span>{source.tag}</span></div>)}</div>
            <div className="exp-excluded"><strong>Исключено из пакета:</strong> {scenario.excluded.join(' · ')}</div>
          </>}
          {stage === 2 && <>
            <span className="exp-overline">GOVERNED EXECUTION / TRUST BOUNDARY</span>
            <h3>AI не получает полномочия автоматически.</h3>
            <p>{scenario.boundary}</p>
            <div className="exp-boundary-options">
              <button type="button" aria-pressed={!violateScope} onClick={() => changeBoundary(false)} className={!violateScope ? 'exp-option-on' : ''}>Разрешённый scope</button>
              <button type="button" aria-pressed={violateScope} onClick={() => changeBoundary(true)} className={violateScope ? 'exp-option-danger' : ''}>Попробовать запрещённое действие</button>
            </div>
            <div className={'exp-policy-response ' + (blocked ? 'exp-policy-deny' : '')}>
              <strong>{blocked ? 'DENIED BEFORE EXECUTION' : 'ALLOWLIST MATCH'}</strong>
              <p>{blocked ? 'В сценарии агент запросил действие вне разрешённой области. Путь блокируется, а система не объявляет работу успешной.' : 'В сценарии область чтения/записи совпадает с политикой. Это ещё не означает, что работа выполнена.'}</p>
            </div>
          </>}
          {stage === 3 && <>
            <span className="exp-overline">TASK → ATTEMPT → EVIDENCE</span>
            <h3>{blocked ? 'Запуск остановлен по политике.' : 'Задача направлена разрешённому исполнителю.'}</h3>
            <p>{blocked ? 'Демонстратор не выполняет запрещённую ветку. Попробуй вернуть разрешённый scope на предыдущем шаге.' : 'В реальной архитектуре локальный исполнитель получает подготовленный контекст, ограничение времени и требования к evidence. Здесь показана схема, а не исполнение кода.'}</p>
            <div className="exp-terminal" aria-label="Примерный журнал переходов">
              <div><span>$</span> resolve mission identity <b>OK</b></div>
              <div><span>$</span> compile scoped context <b>OK</b></div>
              <div><span>$</span> evaluate operation policy <b className={blocked ? 'exp-bad-text' : ''}>{blocked ? 'DENY' : 'ALLOW'}</b></div>
              <div><span>$</span> dispatch bounded attempt <b className={blocked ? 'exp-bad-text' : ''}>{blocked ? 'SKIPPED' : 'SIMULATED'}</b></div>
            </div>
          </>}
          {stage === 4 && <>
            <span className="exp-overline">EVIDENCE GATE / NO FALSE DONE</span>
            <h3>Тесты — не то же самое, что работающий продукт.</h3>
            <p>Нажми «Проверить сценарий». Проверка оценит выбранную политику. Ни один результат здесь не подтверждает реальный CI или deploy.</p>
            <div className="exp-checklist">{scenario.evidence.map((check) => <div key={check}><span>{evaluated ? (blocked ? '×' : '✓') : '○'}</span>{check}</div>)}</div>
            <button type="button" className="exp-action exp-test-action" onClick={() => setEvaluated(true)}>Проверить сценарий</button>
            {evaluated && <p className={blocked ? 'exp-bad-text' : 'exp-success-text'} role="status">{blocked ? 'Отклонено: граница доступа нарушена; positive evidence отсутствует.' : 'Учебная проверка пройдена. Live-приёмка и deployment по-прежнему не подтверждены.'}</p>}
          </>}
          {stage === 5 && <>
            <span className="exp-overline">OWNER HANDOFF / TRUTHFUL STATUS</span>
            <h3>Вместо «готово» — точный отчёт.</h3>
            <p>Один результат связан с задачей, текущей версией, границами доступа и оставшимися действиями.</p>
            <div className="exp-report">
              <div><span>Результат</span><strong>{scenario.outcome}</strong></div>
              <div><span>Вывод</span><strong className={blocked ? 'exp-bad-text' : ''}>{verdict}</strong></div>
              <div><span>Deployment / пользовательская ценность</span><strong>НЕ ПРОВЕРЕНО</strong></div>
              <div><span>Следующее действие</span><strong>{blocked ? 'Вернуть допустимые полномочия' : evaluated ? 'Проверить в реальной среде' : 'Выполнить проверку на шаге 05'}</strong></div>
            </div>
          </>}
        </div>
        <div className="exp-stage-footer">
          <span>ШАГ {stage + 1} ИЗ {STAGES.length} · только обучающий пример</span>
          <div><button type="button" onClick={() => { setStage(0); setViolateScope(false); setEvaluated(false) }}>Сбросить</button><button type="button" className="exp-action" onClick={advance} disabled={stage === STAGES.length - 1}>Следующий этап <span aria-hidden="true">→</span></button></div>
        </div>
      </div>
    </div>
    <div className="exp-legal-note">Эта интерактивная модель не отправляет данные, не подключается к GitHub/Obsidian и не запускает AI. Она демонстрирует документированные правила LOCAL AI OS. <a href="https://github.com/goringich/local-ai-os/blob/main/docs/technical-architecture.md" target="_blank" rel="noreferrer">Архитектурный контракт ↗</a></div>
  </section>
}

const DIFFERENCES = [
  { title: 'Не только код', detail: 'Долгая цель, решение, попытка, проверка и итог связаны между собой.' },
  { title: 'Не только RAG', detail: 'Источник, время, полномочия и доказательства важнее похожего текста.' },
  { title: 'Не только запущенный агент', detail: 'Merge, deploy и эффект для пользователя оцениваются отдельно.' },
  { title: 'Не бесконтрольная автономия', detail: 'Права на действия выдаются по классам и требуют проверок.' },
]

export function ExperiencePreview() {
  return <div className="exp-home-sections">
    <section className="exp-value-section" aria-labelledby="exp-value-title">
      <div className="exp-section-top"><span>01 / WHAT YOU BUY</span><p>Сложная работа с AI становится воспроизводимым процессом. Начальная услуга — узкое внедрение, не доступ к «волшебной нейросети».</p></div>
      <h2 id="exp-value-title">AI пишет код. <em>Кто помнит цель, проверяет результат и отвечает за продолжение?</em></h2>
      <div className="exp-difference-grid">{DIFFERENCES.map((item, index) => <article key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
    </section>
    <DemoStudio compact />
    <section className="exp-value-bottom">
      <div><span className="exp-overline">СЛЕДУЮЩИЙ УРОВЕНЬ</span><h2>Отправь клиенту не схему из 100 блоков, а <em>результат, который можно проверить.</em></h2></div>
      <div><p>Покупатель видит, какие данные получает агент, где он остановится, какие проверки обязательны и что останется после завершения сессии. Глубокая архитектура доступна отдельно.</p><div className="exp-links"><a href={import.meta.env.BASE_URL + 'value'}>Что включено в покупку ↗</a><a href={import.meta.env.BASE_URL + 'compare'}>Сравнение с альтернативами ↗</a></div></div>
    </section>
  </div>
}

function ValueCalculator() {
  const [minutes, setMinutes] = useState(90)
  const [hourlyCost, setHourlyCost] = useState(1500)
  const monthlyExposure = Math.round(minutes * hourlyCost / 60 * 4.33)
  return <section className="exp-calculator" aria-labelledby="exp-calculator-title">
    <div><span className="exp-overline">VALUE DISCOVERY / НЕ ПРОГНОЗ ЭКОНОМИИ</span><h2 id="exp-calculator-title">Сколько стоит потеря контекста <em>в вашей работе?</em></h2><p>Введите собственные исходные данные. Мы рассчитываем размер проблемы, а не обещанную экономию от продукта. Реальный выигрыш станет известен только после согласованного baseline и повторного замера.</p></div>
    <div className="exp-calculator-controls">
      <label htmlFor="exp-time">Минут в неделю на повторное восстановление контекста</label>
      <input id="exp-time" type="number" min="0" max="10000" step="15" value={minutes} onChange={(event) => setMinutes(Math.max(0, Math.min(10000, Number(event.target.value) || 0)))} />
      <label htmlFor="exp-rate">Стоимость рабочего часа, ₽</label>
      <input id="exp-rate" type="number" min="0" max="1000000" step="100" value={hourlyCost} onChange={(event) => setHourlyCost(Math.max(0, Math.min(1000000, Number(event.target.value) || 0)))} />
      <div className="exp-calculated"><span>ГИПОТЕТИЧЕСКИЕ ЗАТРАТЫ НА ПРОБЛЕМУ / МЕСЯЦ</span><strong>{monthlyExposure.toLocaleString('ru-RU')} ₽</strong><small>Расчёт: мин/нед ÷ 60 × ставка × 4,33 недели. Это не измеренный ROI и не прогноз эффекта.</small></div>
    </div>
  </section>
}

export function ValuePage() {
  return <main className="exp-detail-page">
    <div className="exp-detail-hero"><span className="exp-overline">LOCAL AI OS / BUYER GUIDE</span><h1>Что конкретно получает покупатель.</h1><p>Первый продукт — измеримое внедрение одного приватного инженерного workflow. Честно разделяем сегодняшний договор и долгосрочную архитектуру системы.</p><a className="button primary" href={import.meta.env.BASE_URL + 'demo'}>Пройти интерактивную демонстрацию →</a></div>
    <div className="exp-deliverables">
      {[
        ['01', 'Диагностика · 9 900 ₽', 'Один повторяющийся Linux/private-AI workflow, измеримый baseline, карта проблемы и критерий результата. Стоимость полностью засчитывается в пилот.'],
        ['02', 'Ограниченный пилот · 49 900 ₽', 'До пяти рабочих дней: одна Linux-станция, не более трёх проектов, согласованный контекст, модельные маршруты и контролируемые границы выполнения.'],
        ['03', 'Передаваемые материалы', 'Архитектурная карта, runbook, настройки доступа, source/context policy, проверочный отчёт, список ограничений, план восстановления и точный следующий шаг.'],
        ['04', 'Критерии приёмки', 'Проверки объявленных файлов, целостности, рисков секретов, restore dry-run, согласованного UI/runtime-сценария и письменный acceptance report.'],
      ].map(([number, title, body]) => <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{body}</p></div></article>)}
    </div>
    <ValueCalculator />
    <section className="exp-faq">
      <h2>Не входит в обещание</h2>
      <div className="exp-difference-grid">
        <article><h3>Безлимитный AI-исполнитель</h3><p>Никаких обещаний автономно выполнять любые задачи, сливать PR и выпускать релизы без разрешений.</p></article>
        <article><h3>Готовый массовый SaaS</h3><p>Сегодня это founder-led реализация для согласованной Linux-среды, не self-service аккаунт.</p></article>
        <article><h3>Доступ к клиентским секретам</h3><p>Сырые промпты, ключи и закрытые данные не становятся публичной маркетинговой телеметрией.</p></article>
        <article><h3>Гарантированные проценты экономии</h3><p>У существующего founder proof нет парного baseline, поэтому заявлять ROI в процентах нельзя.</p></article>
      </div>
    </section>
    <div className="exp-detail-end"><h2>Следующий шаг — согласовать один дорогостоящий повторяющийся сценарий.</h2><a className="button primary" href="https://t.me/a1gorithms?text=LOCAL%20AI%20OS%20%2F%20diagnostic-2026-07" target="_blank" rel="noreferrer">Обсудить диагностику ↗</a><a href={import.meta.env.BASE_URL + 'acceptance'}>Критерии приёмки ↗</a></div>
  </main>
}

const COMPETITORS = [
  { name: 'Cursor Projects', focus: 'Координация cloud agents и общие проектные файлы', overlap: 'Общая память проекта, работа нескольких агентов', link: 'https://cursor.com/docs/agent/projects' },
  { name: 'Factory Missions', focus: 'Декомпозиция, параллельные исполнители, проверка', overlap: 'Миссии, продолжительная разработка, validation', link: 'https://docs.factory.com/missions/overview' },
  { name: 'GitHub Copilot agents', focus: 'Агенты в GitHub, IDE и cloud workflow', overlap: 'Проектный контекст, задачи, PR и review', link: 'https://docs.github.com/en/copilot/concepts/agent-capabilities/about-agents/about-github-copilot-agents' },
  { name: 'OpenHands', focus: 'Платформа разработки с агентами и enterprise control', overlap: 'Локальные и серверные агенты, контролируемая работа', link: 'https://www.openhands.dev/' },
]

export function ComparePage() {
  return <main className="exp-detail-page">
    <div className="exp-detail-hero"><span className="exp-overline">POSITIONING / EVIDENCE FIRST</span><h1>Мы не заявляем, что конкуренты «не умеют помнить».</h1><p>Рынок уже предлагает память, координацию и проверку. LOCAL AI OS ищет место как локально управляемый, документируемый процесс от контекста до приёмки — с существующими AI-исполнителями, а не обязательно вместо них.</p></div>
    <section className="exp-compare-section"><h2>С кем действительно сравниваться</h2><div className="exp-competitor-list">{COMPETITORS.map((item) => <article key={item.name}><h3>{item.name}</h3><div><span>ПОЗИЦИОНИРОВАНИЕ</span><p>{item.focus}</p></div><div><span>ПЕРЕСЕЧЕНИЕ С LOCAL AI OS</span><p>{item.overlap}</p></div><a href={item.link} rel="noreferrer" target="_blank">Официальный источник ↗</a></article>)}</div></section>
    <section className="exp-faq"><h2>Как проверим отличие на практике</h2><div className="exp-difference-grid">
      <article><h3>Продолжение работы</h3><p>Одни и те же задачи после нескольких сессий: правильный следующий шаг и восстановление принятых решений.</p></article>
      <article><h3>Правда о готовности</h3><p>Доля ложных «готово», когда код написан, но deploy и пользовательский результат не подтверждены.</p></article>
      <article><h3>Цена результата</h3><p>Время, токены, повторная работа и ручные вмешательства на один реально проверенный исход.</p></article>
      <article><h3>Границы данных</h3><p>Нулевое раскрытие запрещённых источников и отказ от небезопасного выполнения при неизвестных полномочиях.</p></article>
    </div></section>
    <div className="exp-detail-end"><h2>Отличие станет доказанным преимуществом только после парных тестов.</h2><p>Пока сравнение — карта пересечений и проверяемая гипотеза, не рейтинг и не заявление о превосходстве.</p><a className="button primary" href={import.meta.env.BASE_URL + 'demo'}>Проверить принцип в демо →</a></div>
  </main>
}
