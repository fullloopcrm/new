import Script from 'next/script'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * Same as ClientErrorMonitor, for routes shared across many tenants by
 * domain (the /apply route-group, the config-driven template) rather than
 * a single known slug -- resolves the tenant from the request's verified
 * header instead, same pattern AnalyticsGate uses for /t.js.
 */
export default async function ClientErrorMonitorByHeaders({ src = '/err.js' }: { src?: string }) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return null

  return (
    <Script
      id="client-error-monitor"
      src={src}
      data-tenant-id={tenant.id as string}
      data-tenant-sig={signTenantHeader(tenant.id as string)}
      strategy="afterInteractive"
    />
  )
}
