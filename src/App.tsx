import { useEffect, useState } from 'react'

const TELEGRAM_URL = 'https://t.me/a1gorithms'
const EMAIL_URL = 'mailto:actingsv@gmail.com?subject=LOCAL%20AI%20OS%20—%20диагностика'

const architecture = [
  { id: '01', title: 'Контекст проектов', text: 'Единая карта проектов, файлов, задач и согласованных команд.' },
  { id: '02', title: 'Маршрутизация моделей', text: 'Выбор локальной или облачной модели по задаче, политике и контексту.' },
  { id: '03', title: 'Obsidian / RAG', text: 'Поиск и подача релевантных знаний вместо повторного чтения всей истории.' },
  { id: '04', title: 'Мониторинг', text: 'Состояние моделей, сервисов, сессий и ограничений в одном контуре.' },
  { id: '05', title: 'Восстановление', text: 'Бэкапы и проверяемый откат данных, настроек и индексов.' },
]

const pilotDays = [
  ['01', 'День 1 — Диагностика и карта рисков', 'Аудит окружения, данных и процессов. Карта рисков и план снижения.'],
  ['02', 'День 2 — Контекст и маршрутизация', 'Подключение источников. Правила маршрутизации запросов и политики доступа.'],
  ['03', 'День 3 — Память, RAG и наблюдаемость', 'Индексация, retrieval-путь, состояние сервисов и измеримые сигналы.'],
  ['04', 'День 4 — Восстановление и защита', 'Бэкапы и откат. Изоляция сервисов, секреты и сетевые границы.'],
  ['05', 'День 5 — Приёмка и передача', 'Проверка ключевых сценариев, документация и передача системы.'],
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
        <a href="#system" onClick={() => setOpen(false)}>Система</a>
        <a href="#pilot" onClick={() => setOpen(false)}>Пилот</a>
        <a href="#acceptance" onClick={() => setOpen(false)}>Приёмка</a>
      </nav>
      <a className="header-cta" href={TELEGRAM_URL} target="_blank" rel="noreferrer">
        Обсудить пилот <ArrowIcon />
      </a>
    </header>
  )
}

function ArchitectureVisual() {
  return (
    <div className="architecture-visual" aria-label="Пять слоёв LOCAL AI OS">
      <span className="corner corner-a" /><span className="corner corner-b" />
      <span className="corner corner-c" /><span className="corner corner-d" />
      {architecture.map((item) => (
        <div className="architecture-layer" key={item.id}>
          <span>{item.id}</span>
          <strong>{item.title.replace(' проектов', '').replace(' моделей', '')}</strong>
          <i aria-hidden="true" />
        </div>
      ))}
    </div>
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
              <h1 id="hero-title">Частный ИИ-контур на вашей Linux-машине.</h1>
              <p>Контекст проектов, локальные модели, Obsidian/RAG, мониторинг и восстановление — собранные в одну проверяемую систему.</p>
              <div className="hero-actions">
                <a className="button button-primary" href={TELEGRAM_URL} target="_blank" rel="noreferrer">Запустить диагностику <ArrowIcon /></a>
                <a className="button button-secondary" href="#pilot">Что входит <ArrowIcon /></a>
              </div>
            </div>
            <ArchitectureVisual />
          </section>

          <div className="facts" aria-label="Условия пилота">
            <div><span>Пилот</span><strong>49 900 ₽</strong></div>
            <div><span>Срок</span><strong>5 рабочих дней</strong></div>
            <div><span>Контур</span><strong>до 3 проектов</strong></div>
          </div>

          <section className="system-section section" id="system" aria-labelledby="system-title">
            <div className="section-heading">
              <h2 id="system-title">Один контур вместо набора инструментов.</h2>
              <p>Собираем существующие компоненты в рабочую систему с одним источником правды и понятными границами.</p>
            </div>
            <div className="system-layout">
              <ol className="system-rail">
                {architecture.map((item) => (
                  <li key={item.id}>
                    <span className="rail-id">{item.id}</span>
                    <h3>{item.title}</h3>
                    <span className="rail-line" aria-hidden="true" />
                    <p>{item.text}</p>
                  </li>
                ))}
              </ol>
              <aside className="runtime-note">
                <h3>Не новый рантайм</h3>
                <p>Интегрируем Ollama, Open WebUI, OpenClaw, Project Atlas и Obsidian без дублирующего центра.</p>
              </aside>
            </div>
          </section>

          <section className="pilot-section section" id="pilot" aria-labelledby="pilot-title">
            <h2 id="pilot-title">Пилот за 5 рабочих дней.</h2>
            <div className="pilot-layout">
              <ol className="day-list">
                {pilotDays.map(([id, title, text]) => (
                  <li key={id}>
                    <span>{id}</span>
                    <div><h3>{title}</h3><p>{text}</p></div>
                  </li>
                ))}
              </ol>
              <aside className="scope-panel">
                <span className="mono-label">scope://pilot</span>
                <strong>1 <small>Linux-машина</small></strong>
                <strong>до 3 <small>проектов</small></strong>
                <strong>49 900 ₽</strong>
                <p>Диагностика <b>9 900 ₽</b> — полностью засчитывается в пилот.</p>
                <a className="button button-primary" href={TELEGRAM_URL} target="_blank" rel="noreferrer">Обсудить пилот <ArrowIcon /></a>
              </aside>
            </div>
          </section>

          <section className="acceptance-section section" id="acceptance" aria-labelledby="acceptance-title">
            <div className="section-heading acceptance-heading">
              <h2 id="acceptance-title">Приёмка по доказательствам.</h2>
              <p>Вы получаете систему, которая запускается на вашем Linux и выдерживает проверку по фактам, а не по обещаниям.</p>
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
          <a href="https://github.com/goringich/system-bootstrap/tree/codex/local-ai-stack-snapshot" target="_blank" rel="noreferrer">Техническая база <ArrowIcon /></a>
        </footer>
      </div>
    </>
  )
}

export default App
