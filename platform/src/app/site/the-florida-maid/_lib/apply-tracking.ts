// Client-side helpers for capturing attribution + firing apply-funnel events.
// Reuses the same `lead_clicks` pipeline as /t.js so funnels can join on visitor_id.

interface Attribution {
  visitor_id: string | null
  session_id: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  referrer: string | null
  landing_page: string
  device: 'mobile' | 'tablet' | 'desktop'
  user_agent: string
}

export function getAttribution(): Attribution {
  if (typeof window === 'undefined') {
    return {
      visitor_id: null,
      session_id: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referrer: null,
      landing_page: '',
      device: 'desktop',
      user_agent: '',
    }
  }

  let visitor_id: string | null = null
  try { visitor_id = localStorage.getItem('flmaid_vid') } catch {}
  if (!visitor_id) {
    const m = document.cookie.match(/flmaid_vid=([^;]+)/)
    visitor_id = m ? m[1] : null
  }

  let session_id: string | null = null
  try { session_id = sessionStorage.getItem('flmaid_sid') } catch {}

  const params = new URLSearchParams(window.location.search)
  const ua = navigator.userAgent || ''
  const isMobile = /Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const isTablet = /iPad|Android(?!.*Mobi)/i.test(ua)

  return {
    visitor_id,
    session_id,
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    referrer: document.referrer || null,
    landing_page: window.location.pathname,
    device: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    user_agent: ua.substring(0, 500),
  }
}

export function trackApply(action: string, extra: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return
  const attr = getAttribution()
  const body = JSON.stringify({
    domain: window.location.hostname.replace(/^www\./, ''),
    page: window.location.pathname,
    action,
    session_id: attr.session_id,
    visitor_id: attr.visitor_id,
    referrer: attr.referrer,
    device: attr.device,
    utm_source: attr.utm_source,
    utm_medium: attr.utm_medium,
    utm_campaign: attr.utm_campaign,
    screen_w: screen.width,
    screen_h: screen.height,
    ...extra,
  })

  if (navigator.sendBeacon) {
    try { if (navigator.sendBeacon('/api/track', body)) return } catch {}
  }
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
