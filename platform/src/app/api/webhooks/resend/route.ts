import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySvix } from '@/lib/webhook-verify'
import { resolveTenantIdForInboundEmail } from '@/lib/inbound-email-tenant'

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
      return NextResponse.json({ ok: true })
    }

    const emailId = data.email_id
    if (!emailId) {
      return NextResponse.json({ ok: true })
    }

    // Look up campaign recipient by resend_email_id
    const { data: recipient } = await supabaseAdmin
      .from('campaign_recipients')
      .select('id, campaign_id, status, client_id, tenant_id')
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
    } else if (type === 'email.suppressed') {
      // Resend's suppression-list event ("the email was not sent because the
      // recipient is on your suppression list" — a prior hard bounce/complaint/
      // unsubscribe) — a terminal non-delivery, same shape as 'email.bounced'
      // just for a send Resend never even attempted. Unhandled until now: the
      // installed resend SDK's own WebhookEvent union (node_modules/resend/
      // dist/index.d.ts) lists it alongside 'bounced'/'complained'/'failed',
      // all three of which already had a branch here — this one didn't, so a
      // suppressed recipient's campaign_recipients row stayed stuck at
      // whatever status it was pre-send (usually 'sent') forever, silently
      // undercounting failed_count below exactly like item (106)'s
      // 'email.failed' gap did before that fix.
      await supabaseAdmin
        .from('campaign_recipients')
        .update({ status: 'bounced' })
        .eq('id', recipient.id)
    } else if (type === 'email.failed') {
      // Resend's async post-acceptance failure event ("the email failed to
      // send due to an error") — distinct from a synchronous send-time error,
      // which campaigns/send/route.ts already catches and marks 'failed'
      // itself. Without this branch, an email Resend accepted but later
      // failed to deliver stayed stuck at 'sent' forever: the aggregate
      // recount below already treats status 'failed' as first-class
      // (`counts.filter(r => r.status === 'failed' || r.status === 'bounced')`)
      // but nothing async ever produced it, so failed_count silently
      // undercounted every async failure.
      await supabaseAdmin
        .from('campaign_recipients')
        .update({ status: 'failed' })
        .eq('id', recipient.id)
    } else if (type === 'email.complained') {
      // Resend's spam-complaint event — nothing in the codebase ever handled this
      // (unlike SMS's STOP-keyword path and the /api/unsubscribe link, both of
      // which set email/sms_marketing_opt_out). A recipient marking a campaign
      // email as spam kept receiving every future campaign until someone noticed
      // the sender reputation/deliverability damage manually. Mirror
      // /api/unsubscribe/route.ts's opt-out write so a complaint has the same
      // effect as clicking unsubscribe.
      await supabaseAdmin
        .from('campaign_recipients')
        .update({ status: 'complained' })
        .eq('id', recipient.id)
      await supabaseAdmin
        .from('clients')
        .update({ email_marketing_opt_out: true, email_marketing_opted_out_at: now })
        .eq('id', recipient.client_id)
        .eq('tenant_id', recipient.tenant_id)
      await supabaseAdmin
        .from('marketing_opt_out_log')
        .insert({
          client_id: recipient.client_id,
          tenant_id: recipient.tenant_id,
          channel: 'email',
          method: 'spam_complaint',
        })
        .then(() => {}, () => {})
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
