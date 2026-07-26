import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

// Force-logs-out every currently active team-portal (field-staff) session for
// THIS tenant only. Team-portal tokens are stateless HMAC tokens with no
// revocation list (see src/app/api/team-portal/auth/token.ts) -- setting this
// marker makes verifyToken() reject any token issued before now, requiring
// re-login. Deliberately per-tenant rather than rotating TEAM_PORTAL_SECRET,
// which is shared with the referrer and sales-partner portals platform-wide
// and would log out every referrer/sales-partner on every tenant too.
//
// tenants is the tenant's own row (identified by id), not a tenant_id-scoped
// child table -- updates go through supabaseAdmin with an explicit .eq('id', ...)
// rather than tenantDb(), matching every other tenants-row self-update in this
// codebase (see dashboard/onboarding/profile/route.ts).
export async function POST() {
  const { tenant, error } = await requirePermission('settings.edit')
  if (error) return error
  const { tenantId } = tenant

  const { error: updateErr } = await supabaseAdmin
    .from('tenants')
    .update({ team_portal_logout_after: new Date().toISOString() })
    .eq('id', tenantId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
