import { useState } from 'react'
import './agent-interfaces.css'

type Interface = {
  id: string
  label: string
  role: string
  prompt: string
  context: string[]
  allowed: string
  boundary: string
  result: string
}

const interfaces: Interface[] = [
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    role: 'Обсуждение, анализ и восстановление контекста',
    prompt: 'Что мы решили по этому проекту? Где остановились и что делать дальше?',
    context: ['Цель и принятые решения', 'Свежий источник Git + provenance', 'Контрольная точка работы', 'Проверенные предыдущие ошибки'],
    allowed: 'Получить безопасную сводку, найти несоответствия и предложить следующий шаг.',
    boundary: 'Существующий ограниченный мост может передавать только разрешённые санитизированные данные. Произвольная запись и запуск на хосте не обещаются.',
    result: 'Ответ с источником, актуальностью, известными blockers и следующим действием.',
  },
  {
    id: 'codex',
    label: 'Codex',
    role: 'Контролируемая реализация и изменение кода',
    prompt: 'Исправь конкретную регрессию и доведи до проверки, сохраняя текущие ограничения.',
    context: ['Контракт задачи и критерий приёмки', 'Текущая ревизия репозитория', 'Известная неудачная попытка', 'Тесты и границы записи'],
    allowed: 'Подготовить bounded попытку, работать внутри разрешённой области, приложить артефакты.',
    boundary: 'Merge, deploy, доступ к секретам и расширение полномочий остаются отдельными разрешёнными действиями.',
    result: 'Diff, связанный с задачей, версия исходников, тесты и отдельный статус live-проверки.',
  },
  {
    id: 'local',
    label: 'Локальная модель',
    role: 'Частный поиск и специализированные операции на своём хосте',
    prompt: 'Найди актуальное техническое решение в моей базе знаний без утечки закрытых файлов.',
    context: ['Scope конкретного проекта', 'Локальный гибридный поиск', 'Релевантные разделы источников', 'Политика безопасности'],
    allowed: 'Ответить с опорой на разрешённые локальные данные при наличии настроенной модели.',
    boundary: 'Модель должна быть установлена и проверена на оборудовании клиента. Локальность модели сама по себе не гарантирует безопасность.',
    result: 'Краткий ответ с provenance и явно обозначенными неизвестными фактами.',
  },
]

export function AgentInterfaces() {
  const [selected, setSelected] = useState('chatgpt')
  const item = interfaces.find(option => option.id === selected) ?? interfaces[0]
  return <section className="agent-interfaces" aria-labelledby="agent-interfaces-title">
    <div className="agent-interfaces-head">
      <div><span className="exp-overline">EXISTING TOOLS / ONE GOVERNED CONTEXT</span>
        <h2 id="agent-interfaces-title">Не вместо ChatGPT. <em>Вместе с ним.</em></h2>
      </div>
      <p>LOCAL AI OS — слой достоверного контекста, контроля задачи и проверки результата. Общаться и работать можно через уже привычные инструменты; интеграция требует согласованной настройки.</p>
    </div>
    <div className="agent-interface-tabs" role="group" aria-label="Интерфейсы AI-работы">
      {interfaces.map(option => <button type="button" key={option.id} aria-pressed={selected === option.id} className={selected === option.id ? 'agent-interface-active' : ''} onClick={() => setSelected(option.id)}>
        <strong>{option.label}</strong><small>{option.role}</small>
      </button>)}
    </div>
    <div className="agent-interface-content" aria-live="polite">
      <div className="agent-interface-chat">
        <div className="agent-interface-chatbar"><span>ПРИМЕР ВЗАИМОДЕЙСТВИЯ</span><span>SIMULATED</span></div>
        <div className="agent-interface-message"><small>ПОЛЬЗОВАТЕЛЬ</small><p>{item.prompt}</p></div>
        <div className="agent-interface-response"><small>КОНТЕКСТ, КОТОРЫЙ ПОДГОТОВИЛА БЫ СИСТЕМА</small>
          <ul>{item.context.map(source => <li key={source}>{source}</li>)}</ul>
        </div>
      </div>
      <div className="agent-interface-contract">
        <div><span className="exp-overline">ВОЗМОЖНОЕ ДЕЙСТВИЕ</span><h3>{item.allowed}</h3></div>
        <div><span className="exp-overline">ГРАНИЦА ДОСТУПА</span><p>{item.boundary}</p></div>
        <div><span className="exp-overline">ЧТО ОСТАНЕТСЯ ПОСЛЕ РАБОТЫ</span><p>{item.result}</p></div>
      </div>
    </div>
    <footer className="agent-interfaces-bottom">Это образовательный интерактивный пример, а не подключённый ChatGPT, Codex или Ollama.
      <a href={import.meta.env.BASE_URL + 'demo'}>Пройти полный сценарий →</a>
    </footer>
  </section>
}
