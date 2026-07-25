import Script from 'next/script'
import ConsentGate from '@/components/consent/ConsentGate'
import { getTenantBySlug } from '@/lib/tenant-lookup'

interface TenantAnalyticsScriptProps {
  slug: string
  src?: string
}

/**
 * t.js requires a data-tenant attribute to fire at all (see public/t.js) —
 * without it the script no-ops silently. This resolves the tenant id
 * server-side so every site layout gets tracking wired the same way.
 */
export default async function TenantAnalyticsScript({ slug, src = '/t.js' }: TenantAnalyticsScriptProps) {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) return null

  return (
    <ConsentGate>
      <Script id="tenant-analytics" src={src} data-tenant={tenant.id} strategy="afterInteractive" />
    </ConsentGate>
  )
}
