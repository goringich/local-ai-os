import ArchitectureBlueprint from './ArchitectureBlueprint'
import ProductHandbook from './ProductHandbook'
import './product-details.css'

const technicalLayers = [
  ['source', 'Obsidian + GitHub', 'Решения, архитектура, run reports и продуктовые ограничения фиксируются в заметках и репозиториях.'],
  ['control', '__home_organized', 'Контекстные пакеты, локальные политики, model routing, evals и нормализованные контракты выполнения.'],
  ['runtime', 'Ollama / Open WebUI / OpenClaw', 'Локальные модели, primary UI, knowledge/RAG, маршрутизация и проектные агенты без второго центра.'],
  ['execution', 'Codex + orchestrator', 'Очередь задач, foreground-исполнение, проверочные команды, shared run reports и понятный next action.'],
  ['cockpit', 'Project Atlas', 'Read-only Mission Control: состояние проектов, очереди, Local Codex Lab, token efficiency и runtime exports.'],
]

const deliverables = [
  ['Architecture map', 'Схема слоёв: source of truth, context, runtime, execution, observability, recovery.'],
  ['Technical runbook', 'Команды запуска, проверки, обновления, отката и типовые failure modes.'],
  ['Release checklist', 'Единый порядок изменения продукта: docs, UI, QA, version tag, release notes.'],
  ['Acceptance report', 'Что проверено, какие артефакты получены, где ограничения, что делать следующим шагом.'],
  ['Operator handoff', 'Как владельцу пользоваться системой без повторного объяснения архитектуры каждому агенту.'],
  ['Safety boundary', 'Границы приватных данных, runtime-выводов и публичной продуктовой документации.'],
]

const releaseFlow = [
  ['plan', 'Product decision', 'Каждое изменение начинается с Obsidian decision note: что меняем, зачем, что не трогаем.'],
  ['build', 'UI + docs patch', 'Обновляются продуктовая страница, техническая документация и README без расхождения offer.'],
  ['verify', 'Release gates', 'npm run qa, offer invariants, docs contract, build, lint и audit-level high.'],
  ['ship', 'Tagged release', 'После merge создаётся GitHub release/tag, публикуется Pages build и фиксируется changelog.'],
  ['learn', 'Post-release note', 'Результат, debt и следующий product increment возвращаются в Obsidian и backlog.'],
]

function ProductDetails() {
  return (
    <>
      <section className="technical-section section" id="technical" aria-labelledby="technical-title">
        <div className="section-heading">
          <h2 id="technical-title">Техническая документация входит в продукт.</h2>
          <p>Поставка не заканчивается красивым экраном. У клиента остаётся карта системы, runbook, release checklist и понятная приёмка.</p>
        </div>
        <div className="technical-grid">
          {technicalLayers.map(([kind, title, text]) => (
            <article className="technical-card" key={kind}>
              <span>{kind}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <ArchitectureBlueprint />

      <section className="deliverables-section section" id="deliverables" aria-labelledby="deliverables-title">
        <div className="section-heading">
          <h2 id="deliverables-title">Что остаётся после внедрения.</h2>
          <p>LOCAL AI OS должен продаваться как связный продукт: интерфейс, документы, pipeline, проверка, handoff и следующий product increment.</p>
        </div>
        <div className="deliverables-grid">
          {deliverables.map(([title, text], index) => (
            <article className="deliverable-card" key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="release-section section" id="release" aria-labelledby="release-title">
        <div className="section-heading">
          <h2 id="release-title">Release train для единого продукта.</h2>
          <p>Каждый релиз проходит один и тот же маршрут: Obsidian decision, UI/docs patch, QA gates, tag/release и post-release note.</p>
        </div>
        <ol className="release-timeline">
          {releaseFlow.map(([phase, title, text], index) => (
            <li key={phase}>
              <span>{phase}</span>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <ProductHandbook />
    </>
  )
}

export default ProductDetails
