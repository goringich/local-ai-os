import { useEffect, useState } from 'react'

type Placement = {
  kind: 'house'
  offer_id: string
  product_id: string
  title: string
  copy: string
  destination: string
  disclosure: string
  targeting_basis: string
}

type Feed = {
  schema_version: string
  host_product: string
  status: string
  placements: Placement[]
  external_sponsored_ads_enabled: boolean
  uses_private_targeting: boolean
  uses_third_party_tracking_pixel?: boolean
}

function validPlacement(value: unknown): value is Placement {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Placement>
  if (item.kind !== 'house' || item.product_id === 'local-ai-os') return false
  if (!item.offer_id || !item.title || !item.destination) return false
  if (item.targeting_basis !== 'host/public context only') return false
  try {
    return new URL(item.destination).protocol === 'https:'
  } catch {
    return false
  }
}

function parseFeed(value: unknown): Placement | null {
  if (!value || typeof value !== 'object') return null
  const feed = value as Partial<Feed>
  if (feed.schema_version !== '2026-08-15.owned-promotion-feed.v1') return null
  if (feed.host_product !== 'local-ai-os') return null
  if (feed.external_sponsored_ads_enabled !== false || feed.uses_private_targeting !== false) return null
  if (feed.uses_third_party_tracking_pixel === true || !Array.isArray(feed.placements)) return null
  return feed.placements.find(validPlacement) ?? null
}

export function OwnedPromotionSlot() {
  const [placement, setPlacement] = useState<Placement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const configured = String(import.meta.env.VITE_OWNED_PROMOTION_FEED_URL || '').trim()
    const url = configured || `${import.meta.env.BASE_URL}promotion-network/local-ai-os-home.json`
    fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => setPlacement(parseFeed(value)))
      .catch(() => setPlacement(null))
    return () => controller.abort()
  }, [])

  if (!placement) return null

  return <aside
    aria-label="Другой наш продукт"
    data-owned-promotion={placement.offer_id}
    style={{
      margin: '72px 0 24px',
      padding: '28px',
      border: '1px solid rgba(255,255,255,.14)',
      borderRadius: '20px',
      background: 'linear-gradient(135deg, rgba(92,246,255,.08), rgba(14,18,26,.92))',
    }}
  >
    <span className="eyebrow">our product · optional next step</span>
    <h2 style={{ marginBottom: 8 }}>{placement.title}</h2>
    <p style={{ maxWidth: 780 }}>{placement.copy}</p>
    <a
      className="text-link"
      href={placement.destination}
      target="_blank"
      rel="noreferrer"
      onClick={() => window.dispatchEvent(new CustomEvent('local-ai-os:aggregate-event', { detail: { name: 'house_ad_click' } }))}
    >
      Открыть проект →
    </a>
  </aside>
}
