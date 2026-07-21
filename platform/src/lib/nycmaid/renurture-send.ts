// Side-effecting half of renurture — actually sending + logging a touch.
// Kept separate from lib/nycmaid/renurture.ts (which stays pure segment/copy
// logic) so both the weekly cron and the pause/cancel event hooks can share
// one send path instead of duplicating the opt-out checks, code generation,
// and dedup-log write. Tenant-aware port from nycmaid.
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS, sendClientEmail } from '@/lib/nycmaid/client-contacts'
import { generateRenurtureCode, getRenurtureCopy, IMMEDIATE_SAVE_TOUCH, type RenurtureTouch } from '@/lib/nycmaid/renurture'

export interface RenurtureClient {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  email_marketing_opt_out: boolean
  sms_marketing_opt_out: boolean
}

// Sends `touch` to `client` if not already sent (renurture_log unique
// constraint is the real guard — this is best-effort dedup avoidance so we
// don't waste a Telnyx/Resend call we know will be thrown away).
// Returns 'sent' | 'already_sent' | 'no_contact_method'.
export async function sendRenurtureTouch(tenantId: string, client: RenurtureClient, touch: RenurtureTouch): Promise<'sent' | 'already_sent' | 'no_contact_method'> {
  const { data: existing } = await supabaseAdmin
    .from('renurture_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .eq('touch_key', touch.key)
    .maybeSingle()
  if (existing) return 'already_sent'

  const emailOk = !!client.email && !client.email_marketing_opt_out
  const smsOk = !!client.phone && !client.sms_marketing_opt_out
  if (!emailOk && !smsOk) return 'no_contact_method'

  const code = generateRenurtureCode(touch)
  const copy = getRenurtureCopy(touch, client.name || 'there', code)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thenycmaid.com'

  let channelSent: 'email' | 'sms' | 'both' | 'none' = 'none'

  if (emailOk) {
    const unsubLink = `${baseUrl}/api/unsubscribe?id=${client.id}`
    const html = copy.emailBody + `<p style="color: #999; font-size: 11px; margin: 32px 0 0 0; text-align: center;"><a href="${unsubLink}" style="color: #999; text-decoration: underline;">Unsubscribe from marketing emails</a></p>`
    const result = await sendClientEmail(client.id, copy.subject, html, { skipOwnerBcc: true }).catch(() => ({ sent: 0, skipped: 1 }))
    if (result.sent > 0) channelSent = 'email'
  }

  if (smsOk) {
    const unsubSmsLink = `${baseUrl}/unsubscribe?id=${client.id}&channel=sms`
    const smsText = `${copy.smsBody}\n\nOpt out of promos: ${unsubSmsLink}`
    const result = await sendClientSMS(client.id, smsText, { skipConsent: true, smsType: 'renurture' }).catch(() => ({ sent: 0, skipped: 1 }))
    if (result.sent > 0) channelSent = channelSent === 'email' ? 'both' : 'sms'
  }

  if (channelSent === 'none') return 'no_contact_method'

  // Unique constraint on (tenant_id, client_id, touch_key) is the real dedup
  // guard — swallow a conflict here.
  await supabaseAdmin.from('renurture_log').insert({
    tenant_id: tenantId,
    client_id: client.id,
    touch_key: touch.key,
    segment: touch.segment,
    touch_num: touch.touchNum,
    channel: channelSent,
    discount_pct: touch.discountPct,
    code,
  }).then(() => {}, () => {})

  return 'sent'
}

// Called from the pause/cancel routes right after a schedule flips off
// 'active'. Only fires if the client has no OTHER active schedule (a
// multi-property client pausing one of several shouldn't get a "we miss
// you" text). Best-effort — callers should invoke this fire-and-forget so
// it never blocks the admin response.
export async function sendImmediateSaveIfLapsed(tenantId: string, clientId: string): Promise<void> {
  try {
    const { count } = await supabaseAdmin
      .from('recurring_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .eq('status', 'active')
    if ((count || 0) > 0) return

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, email_marketing_opt_out, sms_marketing_opt_out')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()
    if (client) await sendRenurtureTouch(tenantId, client, IMMEDIATE_SAVE_TOUCH)
  } catch (err) {
    console.error('Immediate renurture save send failed:', err)
  }
}
