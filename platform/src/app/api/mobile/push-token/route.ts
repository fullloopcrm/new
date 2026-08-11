import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { verifyTenantAdminTokenAnyTenant } from '@/app/api/admin-auth/route'
import { verifyToken as verifyTeamToken } from '@/app/api/team-portal/auth/token'
import { verifyPortalToken as verifyClientToken } from '@/app/api/portal/auth/token'
import { verifySalesPartnerToken } from '@/lib/sales-partner-portal-auth'

// POST /api/mobile/push-token — src/lib/notifications.ts's submitPushToken()
// was calling this and 404ing; nothing existed here. Storage only, matching
// migrations/2026_08_11_mobile_push_tokens.sql's own note: no send path
// reads this table yet.
//
// The bearer token can be any of the 4 PIN-login roles mobile/unified-login
// issues (referral stays OTP-only, same exclusion that route makes, so
// there's no referral token shape to try here). Each role's token is HMAC-
// signed with a different secret, so trying the wrong verifier just fails
// closed on the signature check -- same ROLE_PRIORITY order as
// mobile/unified-login, tried in sequence rather than that route's
// per-role-table lookups since this is auth-only, not a data resolve.
type Identity = { tenantId: string; role: 'admin' | 'team' | 'client' | 'sales'; memberId: string }

function resolveIdentity(bearer: string): Identity | null {
  const admin = verifyTenantAdminTokenAnyTenant(bearer)
  if (admin) return { tenantId: admin.tenantId, role: 'admin', memberId: admin.memberId }

  const team = verifyTeamToken(bearer)
  if (team) return { tenantId: team.tid, role: 'team', memberId: team.id }

  const client = verifyClientToken(bearer)
  if (client) return { tenantId: client.tid, role: 'client', memberId: client.id }

  const sales = verifySalesPartnerToken(bearer)
  if (sales) return { tenantId: sales.tid, role: 'sales', memberId: sales.pid }

  return null
}

const ALLOWED_PLATFORMS = new Set(['ios', 'android', 'web'])

export const OPTIONS = corsPreflight

export const POST = withMobileCors(async function POST(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!bearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identity = resolveIdentity(bearer)
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const platform = typeof body?.platform === 'string' ? body.platform : ''
  if (!token || !ALLOWED_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'token and a valid platform (ios/android/web) are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('mobile_push_tokens')
    .upsert(
      {
        tenant_id: identity.tenantId,
        role: identity.role,
        member_id: identity.memberId,
        platform,
        push_token: token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,role,member_id,platform' },
    )

  if (error) {
    console.error('[mobile/push-token] upsert failed:', error.message)
    return NextResponse.json({ error: 'Could not save push token' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
