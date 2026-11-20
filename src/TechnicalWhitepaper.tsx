import { useMemo, useState, type ReactNode } from 'react'
import whitepaper from '../docs/public-technical-whitepaper-ru.md?raw'
import './technical-whitepaper.css'

type Chapter = { id: number; title: string; content: string }
const FENCE = String.fromCharCode(96).repeat(3)
const segments = whitepaper.split(/(?=^## [0-9]+\.\s)/m)
const introduction = segments.shift() ?? ''
const chapters: Chapter[] = segments.map((content, index) => {
  const heading = content.match(/^## ([0-9]+)\.\s+([^\n]+)/)
  return { id: heading ? Number(heading[1]) : index + 1, title: heading?.[2] ?? 'Раздел', content }
})

function formatInline(source: string): ReactNode[] {
  const expression = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|\x60([^\x60]+)\x60)/g
  const output: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = expression.exec(source)) !== null) {
    if (match.index > last) output.push(source.slice(last, match.index))
    if (match[2] && match[3]) output.push(<a key={output.length} href={match[3]} target="_blank" rel="noreferrer">{match[2]}</a>)
    else if (match[4]) output.push(<strong key={output.length}>{match[4]}</strong>)
    else if (match[5]) output.push(<code key={output.length}>{match[5]}</code>)
    last = match.index + match[0].length
  }
  if (last < source.length) output.push(source.slice(last))
  return output
}

function parseCells(source: string) {
  return source.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
}

function renderMarkdown(source: string): ReactNode[] {
  const lines = source.split(/\r?\n/)
  const nodes: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; continue }
    if (line.startsWith(FENCE)) {
      const language = line.slice(FENCE.length)
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith(FENCE)) content.push(lines[i++])
      if (i < lines.length) i++
      nodes.push(<pre key={nodes.length} aria-label={language ? 'Код: ' + language : 'Пример кода'}><code>{content.join('\n')}</code></pre>)
      continue
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      const formatted = formatInline(heading[2])
      nodes.push(heading[1].length <= 2 ? <h2 key={nodes.length}>{formatted}</h2> :
        heading[1].length === 3 ? <h3 key={nodes.length}>{formatted}</h3> :
          <h4 key={nodes.length}>{formatted}</h4>)
      i++
      continue
    }
    if (line.startsWith('|') && /^\|?\s*:?-{2,}/.test((lines[i + 1] ?? '').trim())) {
      const columns = parseCells(line)
      const data: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) data.push(parseCells(lines[i++]))
      nodes.push(<div key={nodes.length} className="whitepaper-table-scroll"><table>
        <thead><tr>{columns.map((col, index) => <th key={index}>{formatInline(col)}</th>)}</tr></thead>
        <tbody>{data.map((row, index) => <tr key={index}>{row.map((value, j) => <td key={j}>{formatInline(value)}</td>)}</tr>)}</tbody>
      </table></div>)
      continue
    }
    if (/^-{3,}$/.test(line)) { nodes.push(<hr key={nodes.length} />); i++; continue }
    if (/^[-*]\s/.test(line) || /^[0-9]+\.\s/.test(line)) {
      const ordered = /^[0-9]+\.\s/.test(line)
      const re = ordered ? /^[0-9]+\.\s/ : /^[-*]\s/
      const items: string[] = []
      while (i < lines.length && re.test(lines[i].trim())) items.push(lines[i++].trim().replace(re, ''))
      const content = items.map((item, j) => <li key={j}>{formatInline(item)}</li>)
      nodes.push(ordered ? <ol key={nodes.length}>{content}</ol> : <ul key={nodes.length}>{content}</ul>)
      continue
    }
    if (line.startsWith('> ')) {
      const quotes: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) quotes.push(lines[i++].trim().slice(2))
      nodes.push(<blockquote key={nodes.length}>{quotes.map((item, j) => <p key={j}>{formatInline(item)}</p>)}</blockquote>)
      continue
    }
    const words = [line]
    i++
    while (i < lines.length && lines[i].trim()) {
      const candidate = lines[i].trim()
      if (candidate.startsWith(FENCE) || /^(#{1,4}\s|\||[-*]\s|[0-9]+\.\s|>\s|---)/.test(candidate)) break
      words.push(candidate)
      i++
    }
    nodes.push(<p key={nodes.length}>{formatInline(words.join(' '))}</p>)
  }
  return nodes
}

export default function TechnicalWhitepaper() {
  const [section, setSection] = useState(() => {
    const id = Number(new URLSearchParams(window.location.search).get('chapter'))
    return chapters.some(chapter => chapter.id === id) ? id : 1
  })
  const [search, setSearch] = useState('')
  const current = chapters.find(item => item.id === section) ?? chapters[0]
  const filtered = chapters.filter(item => (item.title + ' ' + item.content).toLocaleLowerCase('ru-RU').includes(search.toLocaleLowerCase('ru-RU')))
  const rendered = useMemo(() => renderMarkdown(current.content), [current])
  const intro = useMemo(() => renderMarkdown(introduction), [])

  function select(id: number) {
    setSection(id)
    const url = new URL(window.location.href)
    url.searchParams.set('chapter', String(id))
    window.history.replaceState(null, '', url.pathname + url.search)
    document.getElementById('whitepaper-current')?.scrollIntoView()
  }

  return <main className="whitepaper-page">
    <header className="whitepaper-hero">
      <span className="whitepaper-eyebrow">LOCAL AI OS / SYSTEM REFERENCE / 2026</span>
      <h1>Вся система. <em>От ценности до внутреннего устройства.</em></h1>
      <p>Подробный продуктовый и технический справочник: проблемы, конкуренты, память, агенты, проверки, безопасность, эксплуатация, ограничения и экономика.</p>
      <div className="whitepaper-metadata"><span>{chapters.length} раздела</span><span>Исследовательская версия</span><span>Без закрытых данных</span></div>
    </header>
    <section className="whitepaper-intro" aria-label="Назначение и ограничения">{intro}</section>
    <div className="whitepaper-layout">
      <aside className="whitepaper-sidebar">
        <div className="whitepaper-sidebar-head"><span>ОГЛАВЛЕНИЕ</span><strong>{chapters.length}</strong></div>
        <label htmlFor="whitepaper-search">Поиск по разделам</label>
        <input id="whitepaper-search" type="search" placeholder="RAG, Mission Ledger, безопасность…" value={search} onChange={event => setSearch(event.target.value)} />
        <nav aria-label="Разделы справочника">
          {filtered.length ? filtered.map(item => <button type="button" key={item.id} className={item.id === section ? 'whitepaper-chapter-active' : ''} aria-current={item.id === section ? 'page' : undefined} onClick={() => select(item.id)}>
            <span>{String(item.id).padStart(2, '0')}</span><strong>{item.title}</strong>
          </button>) : <p className="whitepaper-empty">Ничего не найдено.</p>}
        </nav>
      </aside>
      <article className="whitepaper-article" id="whitepaper-current">
        <div className="whitepaper-article-top"><span>РАЗДЕЛ</span><span>{String(section).padStart(2, '0')} / {chapters.length}</span></div>
        <div className="whitepaper-rendered">{rendered}</div>
        <div className="whitepaper-pagination">
          <button type="button" disabled={section === 1} onClick={() => select(Math.max(1, section - 1))}>← Предыдущий</button>
          <button type="button" disabled={section === chapters.length} onClick={() => select(Math.min(chapters.length, section + 1))}>Следующий →</button>
        </div>
      </article>
    </div>
    <footer className="whitepaper-footer">Это документированная архитектура и продуктовая гипотеза, не доказательство текущей работы хоста и не гарантия окупаемости.
      <a href={import.meta.env.BASE_URL + 'value'}>Что входит в покупку →</a>
    </footer>
  </main>
}
