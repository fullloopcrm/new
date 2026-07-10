'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { DNS_COOKIE, getConsentCookie, hasGpcSignal } from '@/app/site/template/_lib/consent'

/**
 * Loads the visitor-measurement script (/t.js) only when the visitor has NOT
 * opted out of sale/share — checked client-side so the template layout stays
 * statically renderable (no cookies()/headers() in the server tree, which would
 * force every SEO marketing page dynamic). Honors both the `fl_dns` opt-out
 * cookie and a Global Privacy Control browser signal.
 */
export default function AnalyticsGate() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    setAllowed(getConsentCookie(DNS_COOKIE) !== '1' && !hasGpcSignal())
  }, [])

  if (!allowed) return null
  return <Script id="site-analytics" src="/t.js" strategy="afterInteractive" />
}
