import Script from 'next/script'
import { getTenantBySlug } from '@/lib/tenant-lookup'
import { signTenantHeader } from '@/lib/tenant-header-sig'

interface ClientErrorMonitorProps {
  slug: string
  src?: string
}

/**
 * Loads public/err.js, which reports uncaught client-side JS errors and
 * unhandled promise rejections to /api/errors (existing endpoint, already
 * wired to error_logs + Telegram, just never had a client-side sender).
 * Not consent-gated like TenantAnalyticsScript -- this is operational/
 * security monitoring, not tracking, so it always loads.
 */
export default async function ClientErrorMonitor({ slug, src = '/err.js' }: ClientErrorMonitorProps) {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) return null

  return (
    <Script
      id="client-error-monitor"
      src={src}
      data-tenant-id={tenant.id}
      data-tenant-sig={signTenantHeader(tenant.id)}
      strategy="afterInteractive"
    />
  )
}
