import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

const TELNYX_API_KEY = (process.env.TELNYX_API_KEY || '').trim()
const TELNYX_VOICE_CONNECTION_ID = (process.env.TELNYX_VOICE_CONNECTION_ID || '').trim()
const TELNYX_FROM_NUMBER = (process.env.TELNYX_FROM_NUMBER || '+18883164019').trim()

// POST /api/admin/comhub/voice/dial
//   { thread_id?, contact_id?, phone?, admin_phone }
// Click-to-call: Telnyx rings admin_phone first; on answer the webhook
// bridges to the customer.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  if (!TELNYX_API_KEY || !TELNYX_VOICE_CONNECTION_ID) {
    return NextResponse.json({
      error: 'voice not configured',
      detail: 'TELNYX_VOICE_CONNECTION_ID env var required',
    }, { status: 503 })
  }

  const body = await req.json().catch(() => null) as {
    thread_id?: string
    contact_id?: string
    phone?: string
    admin_phone?: string
  } | null

  if (!body || !body.admin_phone) {
    return NextResponse.json({ error: 'admin_phone required' }, { status: 400 })
  }

  let customerPhone = body.phone || ''
  let contactId = body.contact_id || null
  let threadId = body.thread_id || null

  if (threadId) {
    const { data: t } = await supabaseAdmin
      .from('comhub_threads')
      .select('id, contact_id, comhub_contacts(phone)')
      .eq('id', threadId)
      .eq('tenant_id', tenantId)
      .single()
    if (t) {
      contactId = (t as { contact_id: string }).contact_id
      const c = (t as { comhub_contacts: { phone: string | null } | { phone: string | null }[] | null }).comhub_contacts
      const single = Array.isArray(c) ? c[0] : c
      customerPhone = customerPhone || single?.phone || ''
    }
  } else if (contactId && !customerPhone) {
    const { data: c } = await supabaseAdmin
      .from('comhub_contacts')
      .select('phone')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single()
    customerPhone = c?.phone || ''
  } else if (customerPhone && !contactId) {
    const { data, error } = await supabaseAdmin
      .rpc('comhub_get_or_create_contact_by_phone', { p_tenant_id: tenantId, p_phone: customerPhone })
    if (error || !data) return NextResponse.json({ error: error?.message || 'contact create failed' }, { status: 500 })
    contactId = data as string
  }

  if (!customerPhone || !contactId) {
    return NextResponse.json({ error: 'could not resolve customer phone' }, { status: 400 })
  }

  if (!threadId) {
    const { data, error } = await supabaseAdmin
      .rpc('comhub_get_or_create_thread', { p_tenant_id: tenantId, p_contact_id: contactId, p_channel: 'voice' })
    if (error || !data) return NextResponse.json({ error: error?.message || 'thread create failed' }, { status: 500 })
    threadId = data as string
  }

  const res = await fetch('https://api.telnyx.com/v2/calls', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TELNYX_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      connection_id: TELNYX_VOICE_CONNECTION_ID,
      to: body.admin_phone,
      from: TELNYX_FROM_NUMBER,
      custom_headers: [
        { name: 'X-Comhub-Thread', value: threadId },
        { name: 'X-Comhub-Contact', value: contactId },
        { name: 'X-Comhub-Customer', value: customerPhone },
        { name: 'X-Comhub-Tenant', value: tenantId },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: 'telnyx call init failed', detail: err }, { status: 502 })
  }
  const data = await res.json()
  const callControlId = data?.data?.call_control_id || null

  await supabaseAdmin.from('comhub_messages').insert({
    tenant_id: tenantId,
    thread_id: threadId,
    contact_id: contactId,
    channel: 'voice',
    direction: 'out',
    author: 'admin',
    body: `📞 Calling… (admin ${body.admin_phone} → ${customerPhone})`,
    to_address: customerPhone,
    external_id: callControlId,
    sent_at: new Date().toISOString(),
  })

  await supabaseAdmin
    .from('comhub_threads')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: `📞 Calling…`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)
    .eq('tenant_id', tenantId)

  return NextResponse.json({ ok: true, call_control_id: callControlId, thread_id: threadId })
}
