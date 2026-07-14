// Tenant-owner side of the Level-1 platform messaging system.
// The owner reads messages from Full Loop (admin) and replies — IN-PLATFORM
// ONLY, no SMS/email. Same `tenant_owner_messages` thread the admin uses.
//   direction 'out' = from platform/admin → owner (incoming for the owner)
//   direction 'in'  = from owner → platform/admin (the owner's own replies)
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId, role } = await getTenantForRequest()
    if (role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('tenant_owner_messages')
      .select('id, direction, channel, body, sender, sender_role, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark admin→owner messages as read now that the owner has loaded the thread.
    await supabaseAdmin
      .from('tenant_owner_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('direction', 'out')
      .is('read_at', null)

    return NextResponse.json({ messages: data || [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, tenant, role } = await getTenantForRequest()
    if (role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let payload: { body?: string }
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
    const body = payload.body?.trim()
    if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

    const { data: inserted, error } = await supabaseAdmin
      .from('tenant_owner_messages')
      .insert({
        tenant_id: tenantId,
        direction: 'in', // in = from owner → platform/admin
        channel: 'platform',
        body,
        sender: 'owner',
        sender_role: 'owner',
      })
      .select('id, direction, channel, body, sender, sender_role, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Surface the reply to the platform admin as an unread notification.
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'owner_message',
      title: `Owner reply — ${tenant?.name ?? 'tenant'}`,
      message: body.slice(0, 200),
      channel: 'system',
      recipient_type: 'admin',
    })

    return NextResponse.json({ ok: true, message: inserted })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
