'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const VISITOR_KEY = 'fl_visitor_id'
const SESSION_KEY = 'fl_session_id'

function getOrCreate(storage: Storage, key: string): string {
  const existing = storage.getItem(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  storage.setItem(key, id)
  return id
}

function deviceType(): string {
  const ua = navigator.userAgent
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  if (/mobile|android|iphone/i.test(ua)) return 'mobile'
  return 'desktop'
}

export default function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      const visitorId = getOrCreate(localStorage, VISITOR_KEY)
      const sessionId = getOrCreate(sessionStorage, SESSION_KEY)
      const params = new URLSearchParams(window.location.search)
      const payload = JSON.stringify({
        session_id: sessionId,
        visitor_id: visitorId,
        referrer: document.referrer || null,
        device: deviceType(),
        page_url: pathname,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
      })
      navigator.sendBeacon('/api/company/track', new Blob([payload], { type: 'application/json' }))
    } catch {
      // Tracking must never break the page.
    }
  }, [pathname])

  return null
}
