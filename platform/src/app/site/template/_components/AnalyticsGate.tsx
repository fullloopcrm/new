import Script from 'next/script'
import ConsentGate from '@/components/consent/ConsentGate'
import { getTenantFromHeaders } from '@/lib/tenant-site'

/**
 * Loads the visitor-measurement script (/t.js) only when consent allows it —
 * see `src/components/consent/ConsentGate.tsx` for the gating logic (GDPR
 * opt-in for EU/EEA/UK/Switzerland visitors, CCPA/CPRA opt-out elsewhere).
 *
 * t.js requires a data-tenant attribute or it no-ops (see public/t.js) —
 * resolved here from the request's verified tenant header so every tenant on
 * the shared template gets tracking wired automatically, no per-tenant code.
 */
export default async function AnalyticsGate() {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return null

  return (
    <ConsentGate>
      <Script id="site-analytics" src="/t.js" data-tenant={tenant.id as string} strategy="afterInteractive" />
    </ConsentGate>
  )
}
