import { useEffect, useMemo, useState } from 'react'
import './promo-film.css'

type ProofMetric = {
  label: string
  value: number | 'unavailable'
  unit: string
  source: string
}

type FounderProof = {
  id: string
  approvedForPublic: boolean
  assisted: ProofMetric[]
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
const FILM_SECONDS = 25

function track(name: string) {
  window.dispatchEvent(new CustomEvent('local-ai-os:aggregate-event', { detail: { name } }))
}

function metric(proof: FounderProof | null, label: string, fallback: string) {
  const value = proof?.assisted.find((item) => item.label === label)?.value
  return typeof value === 'number' ? value.toLocaleString('ru-RU') : fallback
}

export function PromoFilm() {
  const [open, setOpen] = useState(false)
  const [playKey, setPlayKey] = useState(0)
  const [proof, setProof] = useState<FounderProof | null>(null)

  useEffect(() => {
    fetch(`${BASE}/proofs/founder-context-control-001.json`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: FounderProof) => setProof(payload.approvedForPublic ? payload : null))
      .catch(() => setProof(null))
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const claims = useMemo(() => ({
    verified: metric(proof, 'Verified runs', '12'),
    preflight: metric(proof, 'Context-preflight runs', '17'),
    context: metric(proof, 'Recorded input-context characters', '158 460'),
  }), [proof])

  const openFilm = () => {
    setPlayKey((value) => value + 1)
    setOpen(true)
    track('promo_film_open')
  }

  return <>
    <button className="promo-launcher" type="button" onClick={openFilm} aria-haspopup="dialog">
      <span className="promo-launcher-icon" aria-hidden="true">▶</span>
      <span><strong>{FILM_SECONDS}s product film</strong><small>контекст → scope → evidence</small></span>
    </button>

    {open && <div className="promo-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setOpen(false)
    }}>
      <section className="promo-dialog" role="dialog" aria-modal="true" aria-labelledby="promo-film-title">
        <header className="promo-dialog-header">
          <div><span>LOCAL AI OS · proof film 001</span><strong id="promo-film-title">Контролируемый workflow за 25 секунд</strong></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть рекламный ролик">×</button>
        </header>

        <div className="promo-stage" key={playKey} aria-label="Анимированный рекламный ролик LOCAL AI OS">
          <div className="promo-grid" aria-hidden="true" />

          <article className="promo-scene promo-scene-1">
            <span className="promo-kicker">private Linux · Codex · owner-controlled</span>
            <h2>Не больше контекста.<br /><em>Нужный контекст.</em></h2>
            <p>Agent work becomes a controlled evidence loop.</p>
          </article>

          <article className="promo-scene promo-scene-2">
            <div><span className="promo-kicker">bounded context</span><h2>Агент не должен<br />читать лишнее.</h2><p>Сначала релевантные источники. Потом — scoped execution.</p></div>
            <div className="promo-file-card" aria-hidden="true">
              <span>○ docs/architecture.md</span><span>○ runtime/session.log</span><strong>● src/context-pack.ts</strong><strong>● src/project-scope.ts</strong><span>○ notes/old-dump.md</span><strong>● tests/context-pack.test.ts</strong><span>○ cache/tool-output.json</span>
            </div>
          </article>

          <article className="promo-scene promo-scene-3">
            <span className="promo-kicker">explicit responsibility chain</span>
            <h2>Контекст → scope →<br />проверка → отчёт.</h2>
            <ol className="promo-flow" aria-hidden="true"><li>01 <strong>BOUNDED CONTEXT</strong></li><li>02 <strong>SCOPED EXECUTION</strong></li><li>03 <strong>VERIFICATION</strong></li><li>04 <strong>RUN REPORT</strong></li></ol>
          </article>

          <article className="promo-scene promo-scene-4">
            <div><span className="promo-kicker">verification</span><h2>Не «готово».<br /><em>Проверено.</em></h2><p>Required checks run before handoff.</p></div>
            <div className="promo-terminal" aria-hidden="true"><span>&gt; typecheck <b>PASS</b></span><span>&gt; tests <b>PASS</b></span><span>&gt; build <b>PASS</b></span><span>&gt; evidence <b>ATTACHED</b></span><i>▮</i></div>
          </article>

          <article className="promo-scene promo-scene-5">
            <span className="promo-kicker">public-safe founder proof</span>
            <h2>Цифры — только там,<br />где есть evidence.</h2>
            <div className="promo-proof-grid"><div><strong>{claims.verified}</strong><span>verified runs</span></div><div><strong>{claims.preflight}</strong><span>context-preflight runs</span></div><div><strong>{claims.context}</strong><span>recorded input-context chars</span></div></div>
            <small>Matched baseline: unavailable · no invented improvement %</small>
          </article>

          <article className="promo-scene promo-scene-6">
            <span className="promo-kicker">LOCAL AI OS</span>
            <h2>Контекст. Границы.<br />Проверка. Отчёт.</h2>
            <p>Подай один workflow в proof cohort.</p>
            <a href="https://t.me/a1gorithms?text=LOCAL%20AI%20OS%20%2F%20proof-cohort%3A%20%D1%85%D0%BE%D1%87%D1%83%20%D0%BF%D0%BE%D0%B4%D0%B0%D1%82%D1%8C%20%D0%BE%D0%B4%D0%B8%D0%BD%20workflow" target="_blank" rel="noreferrer" onClick={() => track('cohort_cta_click')}>Подать workflow →</a>
          </article>
        </div>

        <footer className="promo-dialog-footer">
          <span>Proof-backed claims · no customer data · no fake baseline</span>
          <button type="button" onClick={() => { setPlayKey((value) => value + 1); track('promo_film_replay') }}>↻ Replay</button>
        </footer>
      </section>
    </div>}
  </>
}
