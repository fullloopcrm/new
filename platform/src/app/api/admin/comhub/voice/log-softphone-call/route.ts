import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { getActiveAdminMemberId } from '@/lib/admin-member'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/admin/comhub/voice/log-softphone-call
// Browser softphone reports outbound dial state (started/answered/ended) into
// comhub. Pure metadata — does not proxy audio.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const adminId = await getActiveAdminMemberId(tenantId)

  const body = (await req.json().catch(() => null)) as {
    customer_phone?: string
    telnyx_call_id?: string
    sip_username?: string
    status?: 'started' | 'answered' | 'ended'
    started_at?: string
    ended_at?: string
    duration_secs?: number
  } | null

  if (!body || !body.customer_phone || !body.telnyx_call_id) {
    return NextResponse.json(
      { error: 'customer_phone and telnyx_call_id required' },
      { status: 400 },
    )
  }

  const { data: cId } = await supabaseAdmin.rpc('comhub_get_or_create_contact_by_phone', {
    p_tenant_id: tenantId,
    p_phone: body.customer_phone,
  })
  if (!cId) return NextResponse.json({ error: 'contact create failed' }, { status: 500 })
  const contactId = cId as string

  const { data: tId } = await supabaseAdmin.rpc('comhub_get_or_create_thread', {
    p_tenant_id: tenantId,
    p_contact_id: contactId,
    p_channel: 'voice',
  })
  if (!tId) return NextResponse.json({ error: 'thread create failed' }, { status: 500 })
  const threadId = tId as string

  if (body.status === 'started') {
    await supabaseAdmin
      .from('comhub_active_calls')
      .upsert(
        {
          tenant_id: tenantId,
          customer_call_id: body.telnyx_call_id,
          thread_id: threadId,
          contact_id: contactId,
          customer_phone: body.customer_phone,
          direction: 'outbound',
          status: 'ringing',
          started_at: body.started_at ?? new Date().toISOString(),
          initiated_by_admin_id: adminId,
        },
        { onConflict: 'customer_call_id' },
      )
    if (adminId) {
      await supabaseAdmin.from('comhub_softphone_calls').insert({
        tenant_id: tenantId,
        admin_id: adminId,
        sip_username: body.sip_username || '',
        customer_phone: body.customer_phone,
        thread_id: threadId,
        contact_id: contactId,
        call_control_id: body.telnyx_call_id,
        status: 'ringing',
      })
    }
    await supabaseAdmin.from('comhub_messages').insert({
      tenant_id: tenantId,
      thread_id: threadId,
      contact_id: contactId,
      channel: 'voice',
      direction: 'out',
      author: 'admin',
      body: `📞 Calling ${body.customer_phone}…`,
      to_address: body.customer_phone,
      external_id: body.telnyx_call_id,
      sent_at: new Date().toISOString(),
    })
    await supabaseAdmin
      .from('comhub_threads')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: `📞 Calling ${body.customer_phone}…`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId)
      .eq('tenant_id', tenantId)
  } else if (body.status === 'answered') {
    await supabaseAdmin
      .from('comhub_active_calls')
      .update({ status: 'bridged', answered_at: new Date().toISOString() })
      .eq('customer_call_id', body.telnyx_call_id)
      .eq('tenant_id', tenantId)
    await supabaseAdmin
      .from('comhub_softphone_calls')
      .update({ status: 'answered' })
      .eq('call_control_id', body.telnyx_call_id)
      .eq('tenant_id', tenantId)
  } else if (body.status === 'ended') {
    await supabaseAdmin
      .from('comhub_active_calls')
      .update({
        status: 'ended',
        ended_at: body.ended_at ?? new Date().toISOString(),
        duration_secs: body.duration_secs ?? null,
      })
      .eq('customer_call_id', body.telnyx_call_id)
      .eq('tenant_id', tenantId)
    await supabaseAdmin
      .from('comhub_softphone_calls')
      .update({ status: 'ended', ended_at: body.ended_at ?? new Date().toISOString() })
      .eq('call_control_id', body.telnyx_call_id)
      .eq('tenant_id', tenantId)
    const dur = body.duration_secs
      ? `${Math.floor(body.duration_secs / 60)}:${String(body.duration_secs % 60).padStart(2, '0')}`
      : '?'
    await supabaseAdmin.from('comhub_messages').insert({
      tenant_id: tenantId,
      thread_id: threadId,
      contact_id: contactId,
      channel: 'voice',
      direction: 'system',
      author: 'system',
      body: `📞 Call ended (${dur})`,
      external_id: body.telnyx_call_id,
      sent_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ ok: true, thread_id: threadId, contact_id: contactId })
}
