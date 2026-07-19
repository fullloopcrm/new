// Shared send+dedup+redemption-code path for a single (tenant, client, touch)
// renurture win-back message. Used by the weekly cron
// (src/app/api/cron/renurture/route.ts) so the claim-before-send dedup logic
// lives in one place instead of being duplicated at every call site.
//
// Claim-before-send (insert the renurture_log row first, THEN send): the same
// race the outreach cron's header comment documents applies here — an
// eligibility SELECT is a point-in-time snapshot, not a lock, so two
// overlapping invocations could both see a client as un-touched. Inserting
// the log row first turns the unique constraint into a real per-touch claim;
// only the invocation whose insert succeeds sends. A failed send (no channel
// reachable, or the provider call throws) releases the claim so a genuine
// failure can retry next run instead of being permanently marked sent.
import { supabaseAdmin } from './supabase'
import { sendSMS } from './sms'
import { sendEmail, tenantSender } from './email'
import { tenantSiteUrl } from './tenant-site'
import { campaignEmail } from './email-templates'
import { unsubscribeUrl } from './unsubscribe-token'
import { generateRenurtureCode, getRenurtureCopy, type RenurtureTouch } from './renurture'

export interface RenurtureTenant {
  id: string
  name: string | null
  slug: string | null
  domain: string | null
  primary_color: string | null
  logo_url: string | null
  address: string | null
  resend_api_key: string | null
  email_from: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
}

export interface RenurtureClient {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  email_marketing_opt_out: boolean | null
  sms_marketing_opt_out: boolean | null
  do_not_service: boolean | null
}

export type RenurtureSendResult =
  | { claimed: false }
  | { claimed: true; sent: false }
  | { claimed: true; sent: true; channel: 'email' | 'sms' | 'both'; code: string }

export async function sendRenurtureTouch(
  tenant: RenurtureTenant,
  client: RenurtureClient,
  touch: RenurtureTouch,
): Promise<RenurtureSendResult> {
  if (client.do_not_service) return { claimed: false }

  const code = generateRenurtureCode(touch.discountPct)
  const bookingUrl = `${tenantSiteUrl(tenant)}/portal/book?renurture_code=${encodeURIComponent(code)}`
  const referralUrl = `${tenantSiteUrl(tenant)}/referral`
  const businessName = tenant.name || 'us'

  const { error: claimErr } = await supabaseAdmin.from('renurture_log').insert({
    tenant_id: tenant.id,
    client_id: client.id,
    touch_key: touch.key,
    segment: touch.segment,
    touch_num: touch.touchNum,
    channel: 'none',
    discount_pct: touch.discountPct,
    redemption_code: code,
  })
  if (claimErr) {
    // Duplicate key = already claimed by another run/invocation — not an error.
    if (!claimErr.message.includes('duplicate key')) {
      console.error('[renurture-send] claim insert failed:', claimErr.message)
    }
    return { claimed: false }
  }

  const copy = getRenurtureCopy(touch, {
    clientName: client.name || 'there',
    businessName,
    bookingUrl,
    code,
    referralUrl,
  })

  const emailOk = !!client.email && !client.email_marketing_opt_out
  const smsOk = !!client.phone && !client.sms_marketing_opt_out
  let emailSent = false
  let smsSent = false

  if (emailOk) {
    try {
      await sendEmail({
        to: client.email!,
        subject: copy.subject,
        html: campaignEmail({
          bodyHtml: copy.emailBody,
          tenantName: businessName,
          primaryColor: tenant.primary_color || undefined,
          logoUrl: tenant.logo_url || undefined,
          businessAddress: tenant.address || undefined,
          unsubscribeUrl: unsubscribeUrl(tenantSiteUrl(tenant), { clientId: client.id, tenantId: tenant.id, channel: 'email' }),
        }),
        from: tenantSender(tenant),
        resendApiKey: tenant.resend_api_key,
      })
      emailSent = true
    } catch (err) {
      console.error(`[renurture-send] email failed tenant=${tenant.id} client=${client.id}:`, err)
    }
  }

  if (smsOk && tenant.telnyx_api_key && tenant.telnyx_phone) {
    try {
      await sendSMS({
        to: client.phone!,
        body: `${copy.smsBody}\nReply STOP to opt out.`,
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      })
      smsSent = true
    } catch (err) {
      console.error(`[renurture-send] sms failed tenant=${tenant.id} client=${client.id}:`, err)
    }
  }

  if (!emailSent && !smsSent) {
    // Release the claim — nothing was actually sent, so this touch is still
    // owed to the client and should be retried on the next run.
    await supabaseAdmin
      .from('renurture_log')
      .delete()
      .eq('tenant_id', tenant.id)
      .eq('client_id', client.id)
      .eq('touch_key', touch.key)
    return { claimed: true, sent: false }
  }

  const channel: 'email' | 'sms' | 'both' = emailSent && smsSent ? 'both' : emailSent ? 'email' : 'sms'
  await supabaseAdmin
    .from('renurture_log')
    .update({ channel })
    .eq('tenant_id', tenant.id)
    .eq('client_id', client.id)
    .eq('touch_key', touch.key)

  return { claimed: true, sent: true, channel, code }
}
