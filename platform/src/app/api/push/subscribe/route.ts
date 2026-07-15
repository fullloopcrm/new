import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getPortalAuth } from '@/lib/team-portal-auth'
import { protectClientAPI } from '@/lib/client-auth'

// Resolves tenantId *and* verifies the caller actually IS the identity they
// claim (team_member_id / client_id), not just that they're on the tenant's
// domain. push_subscriptions rows drive who receives push content
// (sendPushToTenantAdmins/sendPushToTeamMember/sendPushToClient in
// lib/push.ts) -- getCurrentTenant() alone would accept the public,
// unauthenticated x-tenant-id header, letting any site visitor register a
// push endpoint claiming an arbitrary role/team_member_id/client_id and
// silently intercept another identity's notifications.
async function resolveAuthedTenantId(
  request: Request,
  effectiveRole: string,
  teamMemberId: string | undefined,
  clientId: string | undefined,
): Promise<{ tenantId: string } | NextResponse> {
  if (effectiveRole === 'team_member') {
    const auth = getPortalAuth(request)
    if (!auth || auth.id !== teamMemberId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return { tenantId: auth.tid }
  }

  if (effectiveRole === 'client') {
    const tenant = await getTenantFromHeaders()
    if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 404 })
    const auth = await protectClientAPI(tenant.id, clientId)
    if (auth instanceof NextResponse) return auth
    return { tenantId: tenant.id }
  }

  const ctx = await getTenantForRequest()
  return { tenantId: ctx.tenantId }
}

export async function POST(request: Request) {
  try {
    const { subscription, role, team_member_id, client_id } = await request.json()

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const effectiveRole = role || 'admin'

    if (effectiveRole === 'team_member' && !team_member_id) {
      return NextResponse.json({ error: 'Missing team_member_id' }, { status: 400 })
    }
    if (effectiveRole === 'client' && !client_id) {
      return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })
    }

    const resolved = await resolveAuthedTenantId(request, effectiveRole, team_member_id, client_id)
    if (resolved instanceof NextResponse) return resolved
    const { tenantId } = resolved

    // Check if this endpoint already exists
    const { data: existing } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .limit(1)

    if (existing && existing.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({
          subscription,
          role: effectiveRole,
          tenant_id: tenantId,
          team_member_id: effectiveRole === 'team_member' ? team_member_id : null,
          client_id: effectiveRole === 'client' ? client_id : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id)
    } else {
      await supabaseAdmin
        .from('push_subscriptions')
        .insert({
          endpoint: subscription.endpoint,
          subscription,
          role: effectiveRole,
          tenant_id: tenantId,
          team_member_id: effectiveRole === 'team_member' ? team_member_id : null,
          client_id: effectiveRole === 'client' ? client_id : null
        })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Push subscribe error:', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json()

    if (endpoint) {
      await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint)  // tenant-scope-ok: row-scoped by globally-unique push endpoint
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push unsubscribe error:', err)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
