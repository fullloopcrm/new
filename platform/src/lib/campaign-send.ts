import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { getSettings } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { escapeHtml } from '@/lib/escape-html'
import { unsubscribeUrl } from '@/lib/unsubscribe-token'
import type { Tenant } from '@/lib/tenant'

export type CampaignSendResult =
  | { ok: true; sent: number }
  | { ok: false; error: string; status: number }

// Core per-campaign send logic, shared by the manual "Send Now" route
// (POST /api/campaigns/[id]/send, request-scoped tenant) and the
// scheduled-dispatch cron (multi-tenant loop, no request context) so the
// two paths can't drift into two different notions of "send a campaign".
// tenantId and tenant are taken separately (matching how the request-scoped
// route already had them as two distinct fields off tenantCtx) rather than
// derived from tenant.id, so callers aren't required to guarantee tenant.id
// is populated just to scope the campaign/client queries correctly.
export async function sendCampaign(campaignId: string, tenantId: string, tenant: Tenant): Promise<CampaignSendResult> {
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .single()

  if (!campaign) {
    return { ok: false, error: 'Not found', status: 404 }
  }

  // Guard against re-sending: callers may show a send action based on a
  // stale client-side status, so this is enforcement, not just a hint —
  // without it a replayed/duplicate call re-blasts every active client again.
  if (campaign.status === 'sent' || campaign.status === 'sending') {
    return { ok: false, error: 'Campaign has already been sent', status: 400 }
  }

  const settings = await getSettings(tenantId)

  // Tenant rule: campaign_approval_required gates send on an explicit
  // 'approved' status — drafts (and scheduled campaigns) can't ship
  // without sign-off.
  if (settings.campaign_approval_required && campaign.status !== 'approved') {
    return {
      ok: false,
      error: 'This tenant requires campaign approval before sending. Set status to approved first.',
      status: 403,
    }
  }

  // Atomic claim: two concurrent callers (e.g. an admin's manual "Send Now"
  // racing the dispatch cron) both read the same pre-send status and would
  // both pass the checks above -- CAS on that exact status so only one call
  // can flip it to 'sending'. The loser gets null back instead of falling
  // through to double-blast every active client.
  const { data: claimed } = await supabaseAdmin
    .from('campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .eq('status', campaign.status)
    .select('id')
    .maybeSingle()

  if (!claimed) {
    return { ok: false, error: 'Campaign has already been sent', status: 400 }
  }

  // Get recipients (active clients). Per-channel marketing opt-outs are
  // enforced below so a client who opted out of SMS/email marketing is never
  // sent a campaign on that channel (CAN-SPAM / TCPA).
  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, phone, sms_marketing_opt_out, email_marketing_opt_out, sms_consent')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!clients || clients.length === 0) {
    await supabaseAdmin.from('campaigns').update({ status: campaign.status }).eq('id', campaignId)
    return { ok: false, error: 'No eligible recipients', status: 400 }
  }

  let sentCount = 0
  const sendEmails = campaign.type === 'email' || campaign.type === 'both'
  const sendSMSMessages = campaign.type === 'sms' || campaign.type === 'both'

  const hasEmail = !!(tenant.resend_api_key || (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'))

  if (sendEmails && !hasEmail) {
    await supabaseAdmin.from('campaigns').update({ status: campaign.status }).eq('id', campaignId)
    return { ok: false, error: 'Email not configured. Add Resend API key in Settings.', status: 400 }
  }
  if (sendSMSMessages && (!tenant.telnyx_api_key || !tenant.telnyx_phone)) {
    await supabaseAdmin.from('campaigns').update({ status: campaign.status }).eq('id', campaignId)
    return { ok: false, error: 'SMS not configured. Add Telnyx keys in Settings.', status: 400 }
  }

  // Sender display name comes from settings.campaign_sender_name; format as
  // "Name <email>" so Resend uses the configured sender. Resend domain
  // determines the email half — fall back to the platform default when not set.
  const fromName = settings.campaign_sender_name || tenant.name || 'Full Loop'
  const fromEmail = tenant.email_from
    || (tenant.resend_domain ? `noreply@${tenant.resend_domain}` : 'noreply@fullloopcrm.com')
  const fromHeader = `${fromName} <${fromEmail}>`

  for (const client of clients) {
    const personalizedBody = campaign.body
      .replace(/\{name\}/g, escapeHtml(client.name))
      .replace(/\{business\}/g, escapeHtml(tenant.name))

    // Tenant rule: auto_unsubscribe appends a reply-STOP / unsubscribe
    // footer to every outbound email body so each send is one-click
    // opt-out-able. Default true; off only if the tenant explicitly disabled.
    // CAN-SPAM also requires the sender's physical postal address — appended
    // whenever it's on file, independent of the unsubscribe toggle.
    const tenantAddress = tenant.address
    const addressLine = tenantAddress ? `<br>${tenant.name} · ${tenantAddress}` : ''
    // The unsubscribe link must carry the same signed token /api/unsubscribe
    // actually verifies (clientId+tenantId+channel, see unsubscribe-token.ts).
    // Signing can throw if PORTAL_SECRET/ADMIN_TOKEN_SECRET is unset — never
    // let a misconfigured secret take down the whole campaign send.
    let clientUnsubUrl = ''
    if (settings.campaign_auto_unsubscribe) {
      try {
        clientUnsubUrl = unsubscribeUrl(
          process.env.NEXT_PUBLIC_APP_URL || 'https://app.homeservicesbusinesscrm.com',
          { clientId: client.id, tenantId, channel: 'email' },
        )
      } catch (e) {
        console.error('unsubscribeUrl signing failed', e)
      }
    }
    const emailBody = settings.campaign_auto_unsubscribe && clientUnsubUrl
      ? `${personalizedBody}<hr style="margin-top:24px"><p style="font-size:12px;color:#888">You're receiving this because you're a ${tenant.name} client. <a href="${clientUnsubUrl}">Unsubscribe</a>${addressLine}</p>`
      : (tenantAddress ? `${personalizedBody}<hr style="margin-top:24px"><p style="font-size:12px;color:#888">${tenant.name} · ${tenantAddress}</p>` : personalizedBody)

    if (sendEmails && client.email && !client.email_marketing_opt_out) {
      try {
        await sendEmail({
          to: client.email,
          subject: campaign.subject || campaign.name,
          html: emailBody,
          from: fromHeader,
          resendApiKey: tenant.resend_api_key,
        })
        sentCount++
      } catch (e) {
        console.error(`Campaign email failed for ${client.email}:`, e)
      }
    }

    if (sendSMSMessages && client.phone && !client.sms_marketing_opt_out && client.sms_consent !== false) {
      try {
        await sendSMS({
          to: client.phone,
          body: personalizedBody,
          telnyxApiKey: tenant.telnyx_api_key!,
          telnyxPhone: tenant.telnyx_phone!,
        })
        sentCount++
      } catch (e) {
        console.error(`Campaign SMS failed for ${client.phone}:`, e)
      }
    }
  }

  // Update campaign
  await supabaseAdmin
    .from('campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: sentCount,
    })
    .eq('id', campaignId)

  await audit({ tenantId, action: 'campaign.sent', entityType: 'campaign', entityId: campaignId, details: { name: campaign.name, recipients: sentCount } })

  return { ok: true, sent: sentCount }
}
