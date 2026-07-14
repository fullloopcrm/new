import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentTenant } from '@/lib/tenant'
import { verifyPortalToken } from '../../portal/auth/token'
import { verifyToken as verifyTeamPortalToken } from '../../team-portal/auth/token'

// Resolve WHO is subscribing and to WHICH tenant, from server-verified
// identity only. The body's role selects which verification path to use, but
// never supplies the team_member_id/client_id/tenant_id directly — those used
// to be trusted verbatim from the request body, which let any caller (this
// route accepts the public-site signed tenant header too, so no session was
// even required) register a push subscription under ANY team_member_id or
// client_id, including another tenant's, and silently intercept that
// identity's real push notifications (sendPushToTeamMember/sendPushToClient
// in lib/push.ts key off team_member_id/client_id with no tenant_id filter).
async function resolveSubscriber(request: Request, role: string): Promise<
  { ok: true; tenantId: string; teamMemberId: string | null; clientId: string | null }
  | { ok: false; status: number; error: string }
> {
  if (role === 'team_member') {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return { ok: false, status: 401, error: 'Missing token' }
    const auth = verifyTeamPortalToken(token)
    if (!auth) return { ok: false, status: 401, error: 'Invalid token' }
    return { ok: true, tenantId: auth.tid, teamMemberId: auth.id, clientId: null }
  }
  if (role === 'client') {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return { ok: false, status: 401, error: 'Missing token' }
    const auth = verifyPortalToken(token)
    if (!auth) return { ok: false, status: 401, error: 'Invalid token' }
    return { ok: true, tenantId: auth.tid, teamMemberId: null, clientId: auth.id }
  }
  // admin — existing operator-dashboard session (Clerk / admin PIN impersonation).
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, status: 401, error: 'Not authenticated' }
  return { ok: true, tenantId: tenant.id, teamMemberId: null, clientId: null }
}

export async function POST(request: Request) {
  try {
    const { subscription, role } = await request.json()

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const effectiveRole = role || 'admin'
    const subscriber = await resolveSubscriber(request, effectiveRole)
    if (!subscriber.ok) {
      return NextResponse.json({ error: subscriber.error }, { status: subscriber.status })
    }
    const { tenantId, teamMemberId, clientId } = subscriber

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
          team_member_id: teamMemberId,
          client_id: clientId,
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
          team_member_id: teamMemberId,
          client_id: clientId
        })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
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
