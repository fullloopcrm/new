'use client'

import Script from 'next/script'
import ConsentGate from '@/components/consent/ConsentGate'

/**
 * Loads the visitor-measurement script (/t.js) only when consent allows it —
 * see `src/components/consent/ConsentGate.tsx` for the gating logic (GDPR
 * opt-in for EU/EEA/UK/Switzerland visitors, CCPA/CPRA opt-out elsewhere).
 */
export default function AnalyticsGate() {
  return (
    <ConsentGate>
      <Script id="site-analytics" src="/t.js" strategy="afterInteractive" />
    </ConsentGate>
  )
}
