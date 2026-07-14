import { useEffect, useMemo, useState } from 'react'
import { productDocs } from './product-docs/productDocs'
import type { ProductDoc } from './product-docs/types'
import type { Proof } from './proofs/types'
import ArchitectureBlueprint from './ArchitectureBlueprint'

const TELEGRAM_URL = 'https://t.me/a1gorithms?text=LOCAL%20AI%20OS%20%2F%20proof-cohort%3A%20%D1%85%D0%BE%D1%87%D1%83%20%D0%BF%D0%BE%D0%B4%D0%B0%D1%82%D1%8C%20%D0%BE%D0%B4%D0%B8%D0%BD%20workflow'
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
const portalLinks = [
  ['product', 'Продукт'], ['architecture', 'Архитектура'], ['runtime', 'Runtime'], ['context-memory', 'Context/RAG'],
  ['codex-orchestrator', 'Codex'], ['project-atlas', 'Atlas'], ['security', 'Безопасность'], ['deployment', 'Внедрение'],
  ['integrations', 'Интеграции'], ['acceptance', 'Приёмка'], ['operations', 'Эксплуатация'], ['recovery', 'Recovery'],
  ['releases', 'Релизы'], ['roadmap', 'Roadmap'], ['docs', 'Документация'], ['faq', 'FAQ'],
] as const

type ProofIndex = { proofs: Array<Pick<Proof, 'id' | 'kind' | 'status' | 'title' | 'workflow' | 'capturedAt' | 'summary'>> }

function routeHref(route: string) { return `${BASE}${route === '/' ? '/' : route}` }
function currentRoute() {
  const path = window.location.pathname.replace(BASE, '').replace(/\/+$/, '')
  return path || '/'
}
function track(name: string) {
  window.dispatchEvent(new CustomEvent('local-ai-os:aggregate-event', { detail: { name } }))
}
function statusLabel(status: string) {
  return ({ stable: 'stable', experimental: 'experimental', planned: 'planned', unavailable: 'unavailable', verified: 'verified', partial: 'partial' } as Record<string, string>)[status] ?? status
}

function Header({ route }: { route: string }) {
  return <header className="site-header">
    <a className="wordmark" href={routeHref('/')}>LOCAL AI OS</a>
    <nav aria-label="Основная навигация">
      <a className={route.startsWith('/proofs') ? 'is-active' : ''} href={routeHref('/proofs')}>Proofs</a>
      <a className={productDocs.some((doc) => doc.route === route) ? 'is-active' : ''} href={routeHref('/product')}>Технический портал</a>
      <a href={routeHref('/security')}>Безопасность</a>
      <a href={routeHref('/docs')}>Docs</a>
    </nav>
    <a className="header-cta" href={TELEGRAM_URL} target="_blank" rel="noreferrer" onClick={() => track('cohort_cta_click')}>Подать workflow</a>
  </header>
}

function Workflow() {
  return <ol className="workflow" aria-label="Workflow LOCAL AI OS">
    {['bounded context', 'scoped execution', 'verification', 'run report'].map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong></li>)}
  </ol>
}

function Metric({ metric }: { metric: Proof['before'][number] }) {
  return <article className="metric"><span>{metric.label}</span><strong>{metric.value === 'unavailable' ? 'unavailable' : metric.value.toLocaleString('ru-RU')}</strong><small>{metric.value === 'unavailable' ? metric.source : `${metric.unit} · ${metric.source}`}</small></article>
}

function ProofSummary({ proof }: { proof: Proof }) {
  return <section className="proof-summary" aria-labelledby="proof-summary-title">
    <div className="section-kicker">founder proof · public-safe aggregate</div>
    <h2 id="proof-summary-title">Есть измеренные сигналы. Там, где сопоставимых данных нет — честное <em>unavailable</em>.</h2>
    <p>{proof.summary}</p>
    <div className="metric-grid">{proof.assisted.slice(0, 5).map((metric) => <Metric key={metric.label} metric={metric} />)}</div>
    <a className="text-link" href={routeHref(`/proofs/${proof.id}`)} onClick={() => track('proof_view')}>Открыть proof и ограничения →</a>
  </section>
}

function Home() {
  const [proof, setProof] = useState<Proof | null>(null)
  useEffect(() => { fetch(`${BASE}/proofs/founder-context-control-001.json`).then((r) => r.json()).then(setProof).catch(() => setProof(null)) }, [])
  return <main>
    <section className="hero">
      <div><span className="eyebrow">private Linux · Codex · owner-controlled</span><h1>Codex получает только нужный контекст, меняет разрешённое и оставляет результат, которому можно доверять.</h1><p>Когда агент заново читает систему, теряет scope или завершает задачу без проверки, LOCAL AI OS задаёт один наблюдаемый контур: контекст, граница записи, проверка, отчёт.</p><div className="hero-actions"><a className="button primary" href={TELEGRAM_URL} target="_blank" rel="noreferrer" onClick={() => track('cohort_cta_click')}>Подать workflow в proof cohort</a><a className="button quiet" href={routeHref('/proofs')}>Смотреть proofs</a></div></div>
      <aside className="problem-card"><span>Observed failure</span><strong>лишний контекст<br />неверный scope<br />непроверенный handoff</strong><p>Не «универсальная AI OS», а контролируемый workflow для одного повторяющегося задания.</p></aside>
    </section>
    <section className="section"><div className="section-heading"><span>workflow</span><h2>Не магия автономии. Явная цепочка ответственности.</h2></div><Workflow /></section>
    {proof ? <ProofSummary proof={proof} /> : <section className="section"><p>Public-safe proof data unavailable while loading.</p></section>}
    <section className="section demo"><div className="section-heading"><span>demo flow</span><h2>Один workflow — от проблемы до evidence.</h2></div><div className="demo-grid"><article><strong>1. Baseline</strong><p>Фиксируем доступные поля до работы. Неснятые данные не оцениваем.</p></article><article><strong>2. Boundaries</strong><p>Определяем релевантный контекст, writable scope и команды проверки.</p></article><article><strong>3. Report</strong><p>Оставляем evidence, ограничения и следующий точный action владельцу.</p></article></div></section>
    <section className="portal-bridge"><span>technical due diligence</span><h2>Полная архитектура не исчезла. Она доступна после результата.</h2><div>{portalLinks.slice(0, 8).map(([id, title]) => <a key={id} href={routeHref(productDocs.find((doc) => doc.id === id)?.route ?? '/product')}>{title} →</a>)}</div></section>
  </main>
}

function Proofs({ route }: { route: string }) {
  const [index, setIndex] = useState<ProofIndex | null>(null)
  useEffect(() => { fetch(`${BASE}/proofs/index.json`).then((r) => r.json()).then(setIndex).catch(() => setIndex(null)) }, [])
  if (route.startsWith('/proofs/') && index) return <ProofPage id={route.slice('/proofs/'.length)} index={index} />
  return <main className="page"><span className="eyebrow">proof index</span><h1>Обезличенные evidence artifacts.</h1><p className="lead">Каждый proof — public-safe. Founder proof не выдаётся за результат клиента; показатели без записи показываются как unavailable.</p><div className="proof-list">{index?.proofs.map((proof) => <article key={proof.id}><div><span className={`badge ${proof.status}`}>{statusLabel(proof.status)}</span><span className="badge">{proof.kind}</span></div><h2>{proof.title}</h2><p>{proof.summary}</p><small>{proof.workflow} · {proof.capturedAt}</small><a href={routeHref(`/proofs/${proof.id}`)} onClick={() => track('proof_view')}>Открыть и share →</a></article>) ?? <p>Loading proof index…</p>}</div></main>
}

function ProofPage({ id, index }: { id: string; index: ProofIndex }) {
  const [proof, setProof] = useState<Proof | null>(null)
  useEffect(() => { track('proof_view'); fetch(`${BASE}/proofs/${id}.json`).then((r) => r.ok ? r.json() : Promise.reject()).then(setProof).catch(() => setProof(null)) }, [id])
  if (!index.proofs.some((proof) => proof.id === id)) return <NotFound />
  if (!proof) return <main className="page"><p>Loading proof…</p></main>
  const share = async () => { track('proof_share_click'); const url = window.location.href; if (navigator.share) await navigator.share({ title: proof.title, text: proof.shareText, url }); else await navigator.clipboard?.writeText(url) }
  return <main className="page proof-page"><span className="eyebrow">{proof.kind} · {proof.capturedAt}</span><h1>{proof.title}</h1><p className="lead">{proof.workflow}</p><div className="proof-actions"><button type="button" onClick={share}>Share proof</button><a href={TELEGRAM_URL} target="_blank" rel="noreferrer" onClick={() => track('cohort_cta_click')}>Подать свой workflow →</a></div><section><h2>Before</h2><div className="metric-grid">{proof.before.map((metric) => <Metric key={metric.label} metric={metric} />)}</div></section><section><h2>Assisted execution</h2><div className="metric-grid">{proof.assisted.map((metric) => <Metric key={metric.label} metric={metric} />)}</div></section><section className="evidence"><h2>Verification evidence</h2>{proof.verification.map((entry) => <article key={entry.label}><span className={`badge ${entry.result}`}>{entry.result}</span><strong>{entry.label}</strong><p>{entry.evidence}</p></article>)}</section><section><h2>Limits and public boundary</h2><ul>{proof.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul></section></main>
}

function TechnicalPage({ doc }: { doc: ProductDoc }) {
  return <main className="page technical-page"><div className="technical-top"><span className="eyebrow">technical portal</span><span className={`badge ${doc.status}`}>{statusLabel(doc.status)}</span></div><h1>{doc.title}</h1><p className="lead">{doc.summary}</p><aside className="portal-nav">{portalLinks.map(([id, label]) => { const page = productDocs.find((item) => item.id === id); return <a className={doc.id === id ? 'is-active' : ''} href={routeHref(page?.route ?? '/product')} key={id}>{label}</a> })}</aside>{doc.id === 'architecture' && <ArchitectureBlueprint />}<div className="doc-blocks">{doc.blocks.map((block) => <section key={block.heading}><h2>{block.heading}</h2><p>{block.body}</p>{block.bullets.length > 0 && <ul>{block.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}</div><footer className="page-footer"><a href={routeHref('/proofs')}>Proofs →</a><a href={TELEGRAM_URL} target="_blank" rel="noreferrer" onClick={() => track('cohort_cta_click')}>Подать workflow</a></footer></main>
}

function NotFound() { return <main className="page"><span className="eyebrow">404</span><h1>Маршрут не найден.</h1><a className="text-link" href={routeHref('/')}>На главную →</a></main> }

export function ProductSite() {
  const [route, setRoute] = useState(currentRoute)
  useEffect(() => { const onPop = () => setRoute(currentRoute()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop) }, [])
  const doc = useMemo(() => productDocs.find((item) => item.route === route), [route])
  useEffect(() => { document.title = route === '/' ? 'LOCAL AI OS — proof-first workflow' : 'LOCAL AI OS' }, [route])
  const body = route === '/' ? <Home /> : route === '/proofs' || route.startsWith('/proofs/') ? <Proofs route={route} /> : doc ? <TechnicalPage doc={doc} /> : <NotFound />
  return <><a className="skip-link" href="#content">К содержанию</a><div className="site-shell"><Header route={route} /><div id="content">{body}</div><footer className="site-footer"><span>LOCAL AI OS · public product surface</span><a href={routeHref('/docs')}>Public/private boundary</a></footer></div></>
}
