import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import LoginForm from './LoginForm'

/**
 * Per-tenant operator login. Served at <tenant-domain>/fullloop. The business
 * name is resolved server-side (pre-auth) from the domain's signed x-tenant-id
 * header — getTenantForRequest() can't be used here because the operator isn't
 * authenticated yet. The PIN entered is matched against THIS domain's
 * tenant_members (see /api/admin-auth); the minted token is bound to the tenant.
 */
export default async function FullLoopLoginPage() {
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

  return <LoginForm businessName={businessName} />
}
