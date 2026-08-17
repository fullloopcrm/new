import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySvix } from '@/lib/webhook-verify'
import { resolveTenantIdForInboundEmail, parseRecipientAddresses } from '@/lib/inbound-email-tenant'
import { translateInboundComhubMessage } from '@/lib/comhub-translate'

// Same automated/notification-sender heuristic as the IMAP comhub-email cron
// (src/app/api/cron/comhub-email/route.ts) — mirrored rather than imported
// since it's one small regex and the two routes have no other shared surface.
const AUTOMATED_LOCAL_PART = /^(no-?reply|notifications?|alerts?|do-?not-?reply|mailer-daemon|postmaster|bounces?|updates?|failed-payments|ship|service|support-reply)$/i

function isAutomatedInboundSender(fromAddr: string, headers: unknown): boolean {
  const local = fromAddr.split('@')[0] || ''
  if (AUTOMATED_LOCAL_PART.test(local)) return true
  const entries: [string, string][] = Array.isArray(headers)
    ? (headers as Array<{ name?: string; value?: string }>).map((h) => [String(h?.name || '').toLowerCase(), String(h?.value || '')])
    : headers && typeof headers === 'object'
      ? Object.entries(headers as Record<string, unknown>).map(([k, v]) => [k.toLowerCase(), String(v)])
      : []
  const get = (name: string) => entries.find(([k]) => k === name)?.[1]?.toLowerCase()
  if (get('list-unsubscribe')) return true
  const precedence = get('precedence')
  if (precedence && ['bulk', 'list', 'junk'].includes(precedence)) return true
  const autoSubmitted = get('auto-submitted')
  if (autoSubmitted && autoSubmitted !== 'no') return true
  return false
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()

    if (process.env.RESEND_WEBHOOK_VERIFY !== 'off') {
      const result = verifySvix(request.headers, rawBody, process.env.RESEND_WEBHOOK_SECRET)
      if (!result.valid) {
        console.warn('[resend webhook] rejected:', result.reason)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    let body: { type?: string; data?: { email_id?: string } }
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json({ ok: true })
    }

    // Inbound email (Resend "Enable Receiving") → store for the admin inbox.
    // tenant-scope-ok: N/A for tenantDb — this is the platform-wide receiving
    // address; the tenant (if any) isn't known until the row is triaged.
    if (type === 'email.received') {
      const d = data as unknown as Record<string, unknown>
      const join = (v: unknown) =>
        Array.isArray(v) ? v.map(String).join(', ') : typeof v === 'string' ? v : null
      const toAddress = join(d.to)

      // Scope the row to the tenant that owns the recipient address. Fail closed:
      // if no tenant resolves, DROP the message rather than write an unscoped
      // (globally-visible) inbound_emails row that would leak across tenants.
      const tenantId = await resolveTenantIdForInboundEmail(toAddress)
      if (!tenantId) {
        console.error(`[resend inbound] no tenant for recipient "${toAddress}" — dropping unscoped inbound email`)
        return NextResponse.json({ ok: true, dropped: 'no_tenant' })
      }

      await supabaseAdmin.from('inbound_emails').insert({
        tenant_id: tenantId,
        resend_email_id: (d.email_id as string) || (d.id as string) || null,
        from_address: join(d.from),
        to_address: toAddress,
        subject: (d.subject as string) || null,
        text_body: (d.text as string) || null,
        html_body: (d.html as string) || null,
        headers: (d.headers as object) ?? null,
        raw: d,
      })

      // Mirror into CommHub — same destination the IMAP comhub-email cron
      // writes to, so tenants using Resend inbound receiving (MX -> Resend)
      // instead of a polled mailbox get their inbound mail into CommHub too.
      // Best-effort: the inbound_emails row above is already the durable
      // record, so a failure here must not affect the webhook's response.
      try {
        const externalId = (d.email_id as string) || (d.id as string) || null
        const fromRaw = join(d.from)
        const fromAddr = fromRaw ? parseRecipientAddresses(fromRaw)[0] || null : null
        const fromNameMatch = fromRaw ? fromRaw.match(/^"?([^"<]*)"?\s*<[^>]+>/) : null
        const fromName = fromNameMatch ? fromNameMatch[1].trim() || null : null

        if (externalId && fromAddr && !isAutomatedInboundSender(fromAddr, d.headers)) {
          const { data: existing } = await supabaseAdmin
            .from('comhub_messages')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('external_id', externalId)
            .eq('channel', 'email')
            .limit(1)

          if (!existing || existing.length === 0) {
            const { data: contactId } = await supabaseAdmin
              .rpc('comhub_get_or_create_contact_by_email', { p_tenant_id: tenantId, p_email: fromAddr, p_name: fromName })
            const { data: threadId } = contactId
              ? await supabaseAdmin.rpc('comhub_get_or_create_thread', { p_tenant_id: tenantId, p_contact_id: contactId, p_channel: 'email' })
              : { data: null }

            if (threadId) {
              const subject = (d.subject as string) || ''
              const text = (d.text as string) || (typeof d.html === 'string' ? (d.html as string).replace(/<[^>]+>/g, ' ').slice(0, 8000) : '')
              const sentAt = (d.created_at as string) || new Date().toISOString()

              const { data: inboundMsg } = await supabaseAdmin.from('comhub_messages').insert({
                tenant_id: tenantId,
                thread_id: threadId,
                contact_id: contactId,
                channel: 'email',
                direction: 'in',
                author: 'customer',
                subject,
                body: text,
                from_address: fromAddr,
                to_address: toAddress,
                external_id: externalId,
                sent_at: sentAt,
              }).select('id').single()
              if (inboundMsg) translateInboundComhubMessage(inboundMsg.id, text)

              const { data: cur } = await supabaseAdmin
                .from('comhub_threads')
                .select('unread_count')
                .eq('tenant_id', tenantId)
                .eq('id', threadId as string)
                .single()
              await supabaseAdmin
                .from('comhub_threads')
                .update({
                  subject: subject || undefined,
                  last_message_at: sentAt,
                  last_message_preview: (subject ? subject + ' — ' : '') + text.slice(0, 120),
                  unread_count: (cur?.unread_count ?? 0) + 1,
                  updated_at: new Date().toISOString(),
                })
                .eq('tenant_id', tenantId)
                .eq('id', threadId as string)
            }
          }
        }
      } catch (mirrorErr) {
        console.error('[resend webhook] CommHub mirror failed:', mirrorErr)
      }

      return NextResponse.json({ ok: true })
    }

    const emailId = data.email_id
    if (!emailId) {
      return NextResponse.json({ ok: true })
    }

    // Look up campaign recipient by resend_email_id.
    // tenant-scope-ok: N/A for tenantDb — Resend's delivery event only carries
    // its own email_id, not our tenant_id; this lookup IS the tenant resolution,
    // same pattern as telnyx/route.ts's delivery-status branch.
    const { data: recipient } = await supabaseAdmin
      .from('campaign_recipients')
      .select('id, campaign_id, status')
      .eq('resend_email_id', emailId)
      .single()

    if (!recipient) {
      return NextResponse.json({ ok: true })
    }

    const now = new Date().toISOString()

    if (type === 'email.delivered') {
      await supabaseAdmin
        .from('campaign_recipients')
        .update({ status: 'delivered', delivered_at: now })
        .eq('id', recipient.id)
    } else if (type === 'email.opened') {
      if (recipient.status !== 'opened') {
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'opened', opened_at: now })
          .eq('id', recipient.id)
      }
    } else if (type === 'email.bounced') {
      await supabaseAdmin
        .from('campaign_recipients')
        .update({ status: 'bounced' })
        .eq('id', recipient.id)
    } else {
      return NextResponse.json({ ok: true })
    }

    // Recount campaign aggregate stats
    const { data: counts } = await supabaseAdmin
      .from('campaign_recipients')
      .select('status')
      .eq('campaign_id', recipient.campaign_id)

    if (counts) {
      const delivered = counts.filter(r => r.status === 'delivered' || r.status === 'opened').length
      const opened = counts.filter(r => r.status === 'opened').length
      const failed = counts.filter(r => r.status === 'failed' || r.status === 'bounced').length

      await supabaseAdmin
        .from('campaigns')
        .update({ delivered_count: delivered, opened_count: opened, failed_count: failed })
        .eq('id', recipient.campaign_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Resend webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
