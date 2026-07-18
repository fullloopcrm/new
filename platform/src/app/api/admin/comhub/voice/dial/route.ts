import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { resolveTenantVoiceConfig } from '@/lib/comhub-voice-config'
import { rateLimitDb } from '@/lib/rate-limit-db'

// POST /api/admin/comhub/voice/dial
//   { thread_id?, contact_id?, phone?, admin_phone }
// Click-to-call: Telnyx rings admin_phone first; on answer the webhook
// bridges to the customer. Voice config resolved per-tenant (own Telnyx
// account when configured, else platform env fallback).
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const cfg = await resolveTenantVoiceConfig(tenantId)

  if (!cfg.apiKey || !cfg.voiceConnectionId) {
    return NextResponse.json({
      error: 'voice not configured',
      detail: 'Telnyx voice connection required (tenant or platform).',
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

  // body.admin_phone is a free-text number the browser sends (see comhub
  // page's "ring me at" field) with no server-side check that it belongs to
  // a tenant member -- unlike comhub/send's SMS/email branches, this places
  // a real, per-minute-billed outbound PSTN call via the tenant's own Telnyx
  // account to WHATEVER number is supplied. Without a limit, a compromised
  // or rogue admin session (or a scripted client) can toll-fraud the
  // tenant's Telnyx bill by dialing arbitrary (including premium-rate)
  // numbers with no throttle at all. Shares a bucket with voice/control's
  // transfer_blind/transfer_warm, which have the same arbitrary-target,
  // real-call-cost shape.
  const dialRl = await rateLimitDb(`comhub-voice-dial:${tenantId}`, 20, 10 * 60 * 1000)
  if (!dialRl.allowed) {
    return NextResponse.json({ error: 'Too many calls placed. Try again shortly.' }, { status: 429 })
  }

  const res = await fetch('https://api.telnyx.com/v2/calls', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      connection_id: cfg.voiceConnectionId,
      to: body.admin_phone,
      from: cfg.fromNumber,
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
