import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import PortalLoginForm from './PortalLoginForm'

/**
 * Client portal login. Business name is resolved server-side, pre-auth, from
 * the domain's signed x-tenant-id header (falls back to "Full Loop" on the
 * main host, where the login asks for a business code instead) — same
 * pattern as the team portal login. The PIN is matched by /api/portal/auth.
 */
export default async function PortalLoginPage() {
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  const sig = h.get('x-tenant-sig')

  let businessName = 'Full Loop'
  if (tenantId && verifyTenantHeaderSig(tenantId, sig)) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .maybeSingle()
    if (tenant?.name) businessName = tenant.name
  }

  return <PortalLoginForm businessName={businessName} />
}
