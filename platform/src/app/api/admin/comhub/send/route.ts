import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { emailShell } from '@/lib/messaging/shell'

// Resolve @firstname / @first.last mentions to tenant_members rows.
async function resolveMentions(tenantId: string, body: string): Promise<string[]> {
  const handles = Array.from(new Set((body.match(/@([a-zA-Z][a-zA-Z0-9_.-]{0,30})/g) || []).map(s => s.slice(1))))
  if (handles.length === 0) return []

  const userIds = new Set<string>()
  if (handles.includes('here') || handles.includes('channel') || handles.includes('all')) {
    const { data } = await supabaseAdmin
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
    for (const u of data || []) userIds.add(u.id as string)
    return Array.from(userIds)
  }

  const namedHandles = handles.filter(h => h !== 'here' && h !== 'channel' && h !== 'all')
  if (namedHandles.length === 0) return []
  const { data } = await supabaseAdmin
    .from('tenant_members')
    .select('id, name, email')
    .eq('tenant_id', tenantId)
  for (const u of data || []) {
    const lcName = (u.name || '').toLowerCase()
    const lcEmail = (u.email || '').toLowerCase()
    for (const h of namedHandles) {
      const lh = h.toLowerCase()
      if (lcName.startsWith(lh) || lcName.includes(lh) || lcEmail.startsWith(lh)) {
        userIds.add(u.id as string)
      }
    }
  }
  return Array.from(userIds)
}

// POST /api/admin/comhub/send
// Body: { thread_id?, contact_id?, phone?, email?, channel, body, subject?, author_id? }
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  // Comms go out on THIS tenant's own channels (profile creds), never a global.
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, phone, email, address, logo_url, primary_color, telnyx_api_key, telnyx_phone, resend_api_key, email_from')
    .eq('id', tenantId)
    .maybeSingle()

  const body = await req.json().catch(() => null) as {
    thread_id?: string
    contact_id?: string
    phone?: string
    email?: string
    channel?: 'sms' | 'email' | 'internal' | 'web'
    body?: string
    subject?: string
    author_id?: string | null
  } | null

  if (!body || !body.channel || !body.body) {
    return NextResponse.json({ error: 'channel and body are required' }, { status: 400 })
  }

  // Web (portal) reply
  if (body.channel === 'web') {
    if (!body.thread_id) return NextResponse.json({ error: 'thread_id required for web' }, { status: 400 })
    const { data: t } = await supabaseAdmin
      .from('comhub_threads')
      .select('id, contact_id')
      .eq('id', body.thread_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!t) return NextResponse.json({ error: 'thread not found' }, { status: 404 })

    const { data: msg, error: insErr } = await supabaseAdmin
      .from('comhub_messages')
      .insert({
        tenant_id: tenantId,
        thread_id: body.thread_id,
        contact_id: t.contact_id,
        channel: 'web',
        direction: 'out',
        author: 'admin',
        author_id: body.author_id || null,
        body: body.body,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    await supabaseAdmin
      .from('comhub_threads')
      .update({
        last_message_at: msg.sent_at,
        last_message_preview: body.body.slice(0, 140),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.thread_id)
      .eq('tenant_id', tenantId)

    return NextResponse.json({ ok: true, message_id: msg.id, thread_id: body.thread_id })
  }

  // Internal channel post
  if (body.channel === 'internal') {
    if (!body.thread_id) return NextResponse.json({ error: 'thread_id required for internal channel' }, { status: 400 })
    const { data: ch } = await supabaseAdmin
      .from('comhub_threads')
      .select('id, kind, name, slug')
      .eq('id', body.thread_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!ch || ch.kind !== 'channel') {
      return NextResponse.json({ error: 'thread is not an internal channel' }, { status: 400 })
    }

    const authorId = body.author_id || null

    const { data: msg, error: insErr } = await supabaseAdmin
      .from('comhub_messages')
      .insert({
        tenant_id: tenantId,
        thread_id: body.thread_id,
        contact_id: null,
        channel: 'internal',
        direction: 'out',
        author: 'admin',
        author_id: authorId,
        body: body.body,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    const mentionedIds = await resolveMentions(tenantId, body.body)
    const others = mentionedIds.filter(uid => uid !== authorId)
    if (others.length > 0) {
      await supabaseAdmin.from('comhub_mentions').insert(
        others.map(uid => ({
          tenant_id: tenantId,
          user_id: uid,
          thread_id: body.thread_id,
          message_id: msg.id,
          mentioned_by: authorId,
        }))
      )
    }

    await supabaseAdmin
      .from('comhub_threads')
      .update({
        last_message_at: msg.sent_at,
        last_message_preview: body.body.slice(0, 140),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.thread_id)
      .eq('tenant_id', tenantId)

    return NextResponse.json({ ok: true, message_id: msg.id, thread_id: body.thread_id, mentioned: others.length })
  }

  // External channels (sms/email) — resolve contact + thread, send, log
  let contactId = body.contact_id || null
  let threadId = body.thread_id || null
  let phone: string | null = body.phone || null
  let email: string | null = body.email || null

  if (threadId) {
    const { data: t } = await supabaseAdmin
      .from('comhub_threads')
      .select('id, contact_id, channel')
      .eq('id', threadId)
      .eq('tenant_id', tenantId)
      .single()
    if (!t) return NextResponse.json({ error: 'thread not found' }, { status: 404 })
    if (!contactId) contactId = t.contact_id
  }

  // Caller-supplied contact_id is verified against THIS tenant unconditionally
  // — regardless of whether `phone`/`email` are ALSO present in the body.
  // Previously the lookup only ran when both were absent, so a foreign
  // contact_id (with a phone/email attached in the body) skipped validation
  // entirely and flowed straight into comhub_get_or_create_thread and the
  // comhub_messages insert below, stamped with THIS tenant's id — a dangling
  // cross-tenant FK that GET /api/admin/comhub/threads then joins and
  // displays (name/phone/email of the OTHER tenant's contact, inside THIS
  // tenant's thread list).
  if (contactId) {
    const { data: c } = await supabaseAdmin
      .from('comhub_contacts')
      .select('phone, email')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single()
    if (!c) return NextResponse.json({ error: 'contact not found' }, { status: 404 })
    phone = phone || c.phone
    email = email || c.email
  }

  if (!contactId) {
    if (body.channel === 'sms') {
      if (!phone) return NextResponse.json({ error: 'phone required for sms' }, { status: 400 })
      const { data, error } = await supabaseAdmin
        .rpc('comhub_get_or_create_contact_by_phone', { p_tenant_id: tenantId, p_phone: phone })
      if (error || !data) return NextResponse.json({ error: error?.message || 'contact create failed' }, { status: 500 })
      contactId = data as string
    } else {
      if (!email) return NextResponse.json({ error: 'email required for email' }, { status: 400 })
      const { data, error } = await supabaseAdmin
        .rpc('comhub_get_or_create_contact_by_email', { p_tenant_id: tenantId, p_email: email })
      if (error || !data) return NextResponse.json({ error: error?.message || 'contact create failed' }, { status: 500 })
      contactId = data as string
    }
  }

  if (!threadId) {
    const { data, error } = await supabaseAdmin
      .rpc('comhub_get_or_create_thread', { p_tenant_id: tenantId, p_contact_id: contactId, p_channel: body.channel })
    if (error || !data) return NextResponse.json({ error: error?.message || 'thread create failed' }, { status: 500 })
    threadId = data as string
  }

  if (body.channel === 'sms') {
    if (!phone) return NextResponse.json({ error: 'no phone on contact' }, { status: 400 })
    if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) {
      return NextResponse.json({ error: 'SMS is not configured for this business.' }, { status: 400 })
    }
    let smsExternalId: string | null = null
    try {
      const result = await sendSMS({ to: phone, body: body.body, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
      smsExternalId = (result as { data?: { id?: string } } | null)?.data?.id ?? null
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'sms send failed' }, { status: 502 })
    }

    const { data: msg, error: insErr } = await supabaseAdmin
      .from('comhub_messages')
      .insert({
        tenant_id: tenantId,
        thread_id: threadId,
        contact_id: contactId,
        channel: 'sms',
        direction: 'out',
        author: 'admin',
        body: body.body,
        to_address: phone,
        external_id: smsExternalId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // Auto-pause Yinez on this thread for 30 minutes.
    const pauseUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('comhub_threads')
      .update({
        last_message_at: msg.sent_at,
        last_message_preview: body.body.slice(0, 140),
        bot_paused_until: pauseUntil,
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId)
      .eq('tenant_id', tenantId)

    return NextResponse.json({ ok: true, message_id: msg.id, thread_id: threadId, bot_paused_until: pauseUntil })
  }

  if (body.channel === 'email') {
    if (!email) return NextResponse.json({ error: 'no email on contact' }, { status: 400 })
    if (!tenant?.resend_api_key) {
      return NextResponse.json({ error: 'Email is not configured for this business.' }, { status: 400 })
    }
    const subj = body.subject || `Message from ${tenant?.name || 'us'}`
    const bodyHtml = body.body
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
      .join('')
    const html = emailShell({
      brand: {
        name: tenant?.name || 'Full Loop',
        phone: tenant?.phone,
        email: tenant?.email_from || tenant?.email,
        address: tenant?.address,
        logoUrl: tenant?.logo_url,
        primaryColor: tenant?.primary_color,
      },
      heading: subj,
      bodyHtml,
    })
    let externalId: string | null = null
    try {
      const result = await sendEmail({ to: email, subject: subj, html, from: tenant?.email_from || undefined, resendApiKey: tenant?.resend_api_key })
      externalId = (result as { id?: string } | null)?.id ?? null
    } catch (e) {
      return NextResponse.json({ error: 'email send failed', detail: e instanceof Error ? e.message : String(e) }, { status: 502 })
    }

    const { data: msg, error: insErr } = await supabaseAdmin
      .from('comhub_messages')
      .insert({
        tenant_id: tenantId,
        thread_id: threadId,
        contact_id: contactId,
        channel: 'email',
        direction: 'out',
        author: 'admin',
        subject: body.subject || null,
        body: body.body,
        to_address: email,
        external_id: externalId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    await supabaseAdmin
      .from('comhub_threads')
      .update({
        last_message_at: msg.sent_at,
        last_message_preview: (body.subject ? body.subject + ' — ' : '') + body.body.slice(0, 120),
        subject: body.subject || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId)
      .eq('tenant_id', tenantId)

    return NextResponse.json({ ok: true, message_id: msg.id, thread_id: threadId })
  }

  return NextResponse.json({ error: 'unsupported channel' }, { status: 400 })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
