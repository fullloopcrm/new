/**
 * Inbound email → Selena brain → Resend reply (tenant-scoped).
 * Port of nycmaid's selena-email.ts. Tenant is resolved by the caller
 * (the email-monitor cron dispatches per-tenant via tenants.email / tenants.imap_user).
 *
 * Flow:
 *   1. Gate automated / self / DNS senders.
 *   2. Find or lazily create client by email (tenant-scoped).
 *   3. Find or create sms_conversations row keyed by `email-{clientId}` phone.
 *   4. Strip reply quotes + signatures, feed to askSelena('email', ...).
 *   5. Send reply via Resend (per-tenant API key + from address).
 */
import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { askSelena, EMPTY_CHECKLIST } from '@/lib/selena'
import { sendEmail } from '@/lib/email'
import { notify } from '@/lib/notify'
import type { ParsedEmail } from '@/lib/email-monitor'
import type { Tenant } from '@/lib/tenant'

type TenantLike = Pick<Tenant, 'id' | 'name' | 'email' | 'phone' | 'resend_api_key' | 'email_from' | 'domain'>

function extractNewContent(text: string): string {
  if (!text) return ''
  const lines = text.split(/\r?\n/)
  const out: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (/^On .* wrote:?$/i.test(t)) break
    if (/^From:\s/i.test(t)) break
    if (/^-----Original Message-----/i.test(t)) break
    if (/^Sent from my (iPhone|iPad|Samsung|Android)/i.test(t)) break
    if (t.startsWith('>')) continue
    out.push(line)
  }
  return out.join('\n').trim()
}

function formatHtmlReply(text: string, tenant: TenantLike): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>')

  const phoneTel = tenant.phone ? `<a href="tel:${tenant.phone.replace(/[^0-9+]/g, '')}" style="color: #888;">${tenant.phone}</a> · ` : ''
  const siteUrl = tenant.domain ? `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : ''
  const siteLink = siteUrl ? `<a href="${siteUrl}" style="color: #888;">${siteUrl.replace(/^https?:\/\//, '')}</a>` : ''

  return `<div style="font-family: system-ui, -apple-system, sans-serif; font-size: 15px; line-height: 1.5; color: #222;">
  <p>${escaped}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #888; font-size: 13px; margin: 0;">
    ${tenant.name} · ${phoneTel}${siteLink}
  </p>
</div>`
}

function buildReplySubject(originalSubject: string, tenantName: string): string {
  const s = (originalSubject || '').trim()
  if (!s) return `Re: Your message to ${tenantName}`
  return /^re:\s/i.test(s) ? s : `Re: ${s}`
}

export interface InboundEmailResult {
  handled: boolean
  skipped_reason?: string
  conversation_id?: string
  client_id?: string
  reply_sent?: boolean
  error?: string
}

export async function handleInboundEmail(tenant: TenantLike, email: ParsedEmail): Promise<InboundEmailResult> {
  const from = (email.from || '').toLowerCase().trim()
  if (!from) return { handled: false, skipped_reason: 'no_sender' }

  // Avoid loops: don't process our own domain or known automation senders.
  const tenantDomain = (tenant.email || '').toLowerCase().split('@')[1] || ''
  if (tenantDomain && from.endsWith(`@${tenantDomain}`)) {
    return { handled: false, skipped_reason: 'self' }
  }
  if (/^(mailer-daemon|postmaster|no-?reply|auto-?reply|notification)@/i.test(from)) {
    return { handled: false, skipped_reason: 'automated_sender' }
  }
  if (/out of office|automatic reply|vacation|delivery status notification|undeliverable/i.test(email.subject || '')) {
    return { handled: false, skipped_reason: 'auto_responder' }
  }

  // Look up client in tenant scope by email
  let { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone, email, do_not_service')
    .eq('tenant_id', tenant.id)
    .ilike('email', from)
    .limit(1)
    .maybeSingle()

  if (!client) {
    const fromNameGuess = (email.fromName || '').trim() || from.split('@')[0].replace(/[._-]+/g, ' ')
    const { data: created, error: createErr } = await supabaseAdmin
      .from('clients')
      .insert({
        tenant_id: tenant.id,
        email: from,
        name: fromNameGuess || 'New Lead',
        phone: `email-${from}`,
        status: 'potential',
        pin: randomInt(100000, 1000000).toString(),
      })
      .select('id, name, phone, email, do_not_service')
      .single()
    if (createErr || !created) {
      return { handled: false, error: `lead_create_failed: ${createErr?.message}` }
    }
    client = created
    await notify({
      tenantId: tenant.id,
      type: 'new_lead',
      title: `New Email Lead — ${fromNameGuess || from}`,
      message: `Unknown sender ${from} just emailed. Selena is engaging.`,
    }).catch(() => {})
  }

  if (client.do_not_service) {
    return { handled: false, skipped_reason: 'dns_client', client_id: client.id }
  }

  const emailKey = `email-${client.id}`
  const tenMinAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  let { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('id, state, completed_at, expired')
    .eq('tenant_id', tenant.id)
    .eq('client_id', client.id)
    .eq('phone', emailKey)
    .eq('expired', false)
    .or(`completed_at.is.null,completed_at.gte.${tenMinAgoIso}`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!convo) {
    const { data: created, error: createErr } = await supabaseAdmin
      .from('sms_conversations')
      .insert({
        tenant_id: tenant.id,
        phone: emailKey,
        client_id: client.id,
        state: 'active',
        booking_checklist: {
          ...EMPTY_CHECKLIST,
          channel: 'email',
          phone: client.phone || null,
          name: client.name || null,
          email: client.email || from,
        },
      })
      .select('id, state, completed_at, expired')
      .single()
    if (createErr || !created) {
      return { handled: false, error: `convo_create_failed: ${createErr?.message}` }
    }
    convo = created
  }

  const cleaned = extractNewContent(email.text || '')
  if (!cleaned) return { handled: false, skipped_reason: 'empty_after_strip', conversation_id: convo.id }

  await supabaseAdmin.from('sms_conversation_messages').insert({
    conversation_id: convo.id,
    tenant_id: tenant.id,
    direction: 'inbound',
    message: cleaned,
  }).then(() => {}, () => {})

  const result = await askSelena(tenant.id, 'email', cleaned, convo.id, client.phone || undefined)
  const reply = result.text || `Thanks for reaching out — we'll get back to you shortly.`

  await supabaseAdmin.from('sms_conversation_messages').insert({
    conversation_id: convo.id,
    tenant_id: tenant.id,
    direction: 'outbound',
    message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(),
  }).then(() => {}, () => {})

  const html = formatHtmlReply(reply, tenant)
  const replySubject = buildReplySubject(email.subject, tenant.name)

  try {
    await sendEmail({
      to: from,
      subject: replySubject,
      html,
      from: tenant.email_from || undefined,
      resendApiKey: tenant.resend_api_key || null,
    })
  } catch (err) {
    return {
      handled: true,
      conversation_id: convo.id,
      client_id: client.id,
      reply_sent: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  interface ResultWithBooking { bookingCreated?: boolean }
  if ((result as unknown as ResultWithBooking).bookingCreated) {
    await notify({
      tenantId: tenant.id,
      type: 'new_booking',
      title: 'New Email Booking',
      message: `${client.name || from} booked via email reply`,
    }).catch(() => {})
  }

  return {
    handled: true,
    conversation_id: convo.id,
    client_id: client.id,
    reply_sent: true,
  }
}
