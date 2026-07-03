import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import ResetPinForm from './ResetPinForm'

/**
 * Self-service PIN reset for a tenant operator. Business name is resolved
 * server-side from the domain's signed x-tenant-id header — same pattern as the
 * login page. The reset itself is tenant-scoped (see /api/pin-reset).
 */
export default async function ResetPinPage() {
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

  return <ResetPinForm businessName={businessName} />
}
