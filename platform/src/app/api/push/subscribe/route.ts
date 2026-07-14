import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'
import { getPortalAuth } from '@/lib/team-portal-auth'
import { verifyPortalToken } from '@/app/api/portal/auth/token'
import { verifyClientSessionToken, clientSessionCookieOptions } from '@/lib/client-auth'

// Identity (tenant_id / team_member_id / client_id) is ALWAYS derived from a
// verified session/token below, never trusted from the request body. The
// caller only picks which *role* it's asking to subscribe as; role='admin'
// requires an authenticated dashboard admin session (getTenantForRequest),
// not just a host-resolved tenant — a plain website visitor on a tenant's own
// domain also gets a resolvable tenant via middleware's signed header, which
// is not proof of any login. Without this, anyone could self-subscribe as
// 'admin' (or as an arbitrary team_member_id/client_id) and silently receive
// that tenant's operational push notifications (bookings, client names, etc).
export async function POST(request: Request) {
  try {
    const { subscription, role } = await request.json()

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const effectiveRole = role || 'admin'
    let tenantId: string
    let teamMemberId: string | null = null
    let clientId: string | null = null

    if (effectiveRole === 'admin') {
      const tenant = await getTenantForRequest().catch(() => null)
      if (!tenant) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      tenantId = tenant.tenantId
    } else if (effectiveRole === 'team_member') {
      const auth = getPortalAuth(request)
      if (!auth) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      tenantId = auth.tid
      teamMemberId = auth.id
    } else if (effectiveRole === 'client') {
      const bearer = request.headers.get('authorization')?.replace('Bearer ', '')
      const portalAuth = bearer ? verifyPortalToken(bearer) : null
      if (portalAuth) {
        tenantId = portalAuth.tid
        clientId = portalAuth.id
      } else {
        const cookieStore = await cookies()
        const session = verifyClientSessionToken(cookieStore.get(clientSessionCookieOptions().name)?.value)
        if (!session) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        tenantId = session.tenantId
        clientId = session.clientId
      }
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

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
