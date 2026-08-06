/**
 * Shared ComHub send logic, extracted from /api/admin/comhub/send so the
 * mobile-scoped route (/api/mobile/comhub/send, tenant bearer-token auth
 * via getTenantForRequest() instead of the platform requireAdmin() gate)
 * doesn't duplicate the sms/email/web/internal send paths, contact
 * auto-link, thread auto-create, and mention-resolution logic — same
 * reasoning as comhub-threads.ts for the GET list route.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { emailShell } from '@/lib/messaging/shell'

export interface SendComhubMessageBody {
  thread_id?: string
  contact_id?: string
  phone?: string
  email?: string
  channel?: 'sms' | 'email' | 'internal' | 'web'
  body?: string
  subject?: string
  author_id?: string | null
  media_urls?: string[]
}

// Only the tenant columns the send paths actually read — callers pass
// whatever subset of the full `tenants` row they already have on hand
// (a targeted select in the admin route, the already-fetched `ctx.tenant`
// in the mobile route).
export interface ComhubSendTenant {
  name: string | null
  phone: string | null
  email: string | null
  address: string | null
  logo_url: string | null
  primary_color: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  resend_api_key: string | null
  email_from: string | null
}

export interface SendResult {
  status: number
  json: Record<string, unknown>
}

function ok(json: Record<string, unknown>): SendResult {
  return { status: 200, json }
}

function fail(status: number, error: string, extra?: Record<string, unknown>): SendResult {
  return { status, json: { error, ...extra } }
}

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// `authorLabel` is the comhub_messages.author value ('admin' for every
// caller today — both the platform dashboard and the mobile app authenticate
// as a tenant owner/admin). `authorId` is the tenant_members id to stamp and
// to resolve @mentions against; callers should pass an authenticated id
// (never trust a client-supplied one for the mobile path — see the mobile
// route for why).
export async function sendComhubMessage(
  tenantId: string,
  tenant: ComhubSendTenant | null,
  body: SendComhubMessageBody,
  authorLabel: string,
  authorId: string | null,
): Promise<SendResult> {
  if (!body || !body.channel || !body.body) {
    return fail(400, 'channel and body are required')
  }

  // Web (portal) reply
  if (body.channel === 'web') {
    if (!body.thread_id) return fail(400, 'thread_id required for web')
    const { data: t } = await supabaseAdmin
      .from('comhub_threads')
      .select('id, contact_id')
      .eq('id', body.thread_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!t) return fail(404, 'thread not found')

    const { data: msg, error: insErr } = await supabaseAdmin
      .from('comhub_messages')
      .insert({
        tenant_id: tenantId,
        thread_id: body.thread_id,
        contact_id: t.contact_id,
        channel: 'web',
        direction: 'out',
        author: authorLabel,
        author_id: authorId,
        body: body.body,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insErr) return fail(500, insErr.message)

    await supabaseAdmin
      .from('comhub_threads')
      .update({
        last_message_at: msg.sent_at,
        last_message_preview: body.body.slice(0, 140),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.thread_id)
      .eq('tenant_id', tenantId)

    return ok({ ok: true, message_id: msg.id, thread_id: body.thread_id })
  }

  // Internal channel post
  if (body.channel === 'internal') {
    if (!body.thread_id) return fail(400, 'thread_id required for internal channel')
    const { data: ch } = await supabaseAdmin
      .from('comhub_threads')
      .select('id, kind, name, slug')
      .eq('id', body.thread_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!ch || ch.kind !== 'channel') {
      return fail(400, 'thread is not an internal channel')
    }

    const { data: msg, error: insErr } = await supabaseAdmin
      .from('comhub_messages')
      .insert({
        tenant_id: tenantId,
        thread_id: body.thread_id,
        contact_id: null,
        channel: 'internal',
        direction: 'out',
        author: authorLabel,
        author_id: authorId,
        body: body.body,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insErr) return fail(500, insErr.message)

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

    return ok({ ok: true, message_id: msg.id, thread_id: body.thread_id, mentioned: others.length })
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
    if (!t) return fail(404, 'thread not found')
    if (!contactId) contactId = t.contact_id
  }

  // Caller-supplied contact_id is verified against THIS tenant unconditionally
  // — regardless of whether `phone`/`email` are ALSO present in the body.
  // A foreign contact_id (with a phone/email attached in the body) must not
  // skip validation and flow straight into comhub_get_or_create_thread and
  // the comhub_messages insert below, stamped with THIS tenant's id.
  if (contactId) {
    const { data: c } = await supabaseAdmin
      .from('comhub_contacts')
      .select('phone, email')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single()
    if (!c) return fail(404, 'contact not found')
    phone = phone || c.phone
    email = email || c.email
  }

  if (!contactId) {
    if (body.channel === 'sms') {
      if (!phone) return fail(400, 'phone required for sms')
      const { data, error } = await supabaseAdmin
        .rpc('comhub_get_or_create_contact_by_phone', { p_tenant_id: tenantId, p_phone: phone })
      if (error || !data) return fail(500, error?.message || 'contact create failed')
      contactId = data as string
    } else {
      if (!email) return fail(400, 'email required for email')
      const { data, error } = await supabaseAdmin
        .rpc('comhub_get_or_create_contact_by_email', { p_tenant_id: tenantId, p_email: email })
      if (error || !data) return fail(500, error?.message || 'contact create failed')
      contactId = data as string
    }
  }

  if (!threadId) {
    const { data, error } = await supabaseAdmin
      .rpc('comhub_get_or_create_thread', { p_tenant_id: tenantId, p_contact_id: contactId, p_channel: body.channel })
    if (error || !data) return fail(500, error?.message || 'thread create failed')
    threadId = data as string
  }

  if (body.channel === 'sms') {
    if (!phone) return fail(400, 'no phone on contact')
    if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) {
      return fail(400, 'SMS is not configured for this business.')
    }
    const mediaUrls = Array.isArray(body.media_urls) ? body.media_urls.filter((u): u is string => typeof u === 'string' && u.length > 0) : []

    let smsExternalId: string | null = null
    try {
      const result = await sendSMS({ to: phone, body: body.body, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone, mediaUrls })
      smsExternalId = (result as { data?: { id?: string } } | null)?.data?.id ?? null
    } catch (e) {
      return { status: 502, json: { error: e instanceof Error ? e.message : 'sms send failed' } }
    }

    const { data: msg, error: insErr } = await supabaseAdmin
      .from('comhub_messages')
      .insert({
        tenant_id: tenantId,
        thread_id: threadId,
        contact_id: contactId,
        channel: 'sms',
        direction: 'out',
        author: authorLabel,
        body: body.body,
        to_address: phone,
        external_id: smsExternalId,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insErr) return fail(500, insErr.message)

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

    return ok({ ok: true, message_id: msg.id, thread_id: threadId, bot_paused_until: pauseUntil })
  }

  if (body.channel === 'email') {
    if (!email) return fail(400, 'no email on contact')
    if (!tenant?.resend_api_key) {
      return fail(400, 'Email is not configured for this business.')
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
      return { status: 502, json: { error: 'email send failed', detail: e instanceof Error ? e.message : String(e) } }
    }

    const { data: msg, error: insErr } = await supabaseAdmin
      .from('comhub_messages')
      .insert({
        tenant_id: tenantId,
        thread_id: threadId,
        contact_id: contactId,
        channel: 'email',
        direction: 'out',
        author: authorLabel,
        subject: body.subject || null,
        body: body.body,
        to_address: email,
        external_id: externalId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insErr) return fail(500, insErr.message)

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

    return ok({ ok: true, message_id: msg.id, thread_id: threadId })
  }

  return fail(400, 'unsupported channel')
}
