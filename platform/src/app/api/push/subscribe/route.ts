import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentTenant } from '@/lib/tenant'

export async function POST(request: Request) {
  try {
    const { subscription, role, team_member_id, client_id } = await request.json()

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const effectiveRole = role || 'admin'

    if (effectiveRole === 'team_member' && !team_member_id) {
      return NextResponse.json({ error: 'Missing team_member_id' }, { status: 400 })
    }
    if (effectiveRole === 'client' && !client_id) {
      return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })
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
          tenant_id: tenant.id,
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
          tenant_id: tenant.id,
          team_member_id: effectiveRole === 'team_member' ? team_member_id : null,
          client_id: effectiveRole === 'client' ? client_id : null
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
      await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push unsubscribe error:', err)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
