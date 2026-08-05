/**
 * Payment reminder cadence — global, all tenants (see CLAUDE.md GLOBAL RULE).
 * Anchor point is `fifteen_min_alert_time`, stamped by the 30-min-alert route
 * when the initial bill + pay-link text goes out.
 *
 * Client nudges at 15min / 60min / 2hr / 4hr / 6hr past that anchor (one text
 * per stage, staged via a count of prior `payment_nudge` sms_logs rows for the
 * booking — no schema change needed). After the 6hr stage, if still unpaid,
 * stop texting the client and escalate once to the tenant's own admin via
 * Telegram + email (dedup'd through a `payment_overdue` admin_tasks row).
 *
 * "Still owes" filter: payment_status NOT IN ('paid','partial') AND
 * payment_method IS NULL — excludes anyone who partially paid or self-reported
 * payment (e.g. told the agent "paid").
 */
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { sendEmail } from '@/lib/nycmaid/email'
import { sendTelegram } from '@/lib/telegram'
import { getCommPrefs } from '@/lib/comms-prefs'

const STAGES_MIN = [15, 60, 120, 240, 360]
const SMS_TYPE = 'payment_nudge'
const ESCALATE_TASK_TYPE = 'payment_overdue'

export interface ReminderTenant {
  id: string
  name: string
  telnyx_api_key: string | null
  telnyx_phone: string | null
  payment_link: string | null
  owner_email: string | null
  telegram_bot_token: string | null
  telegram_chat_id: string | null
}

function buildPayLink(tenant: ReminderTenant, bookingId: string): string {
  if (!tenant.payment_link) return ''
  const sep = tenant.payment_link.includes('?') ? '&' : '?'
  return `${tenant.payment_link}${sep}client_reference_id=${bookingId}`
}

function stageText(stageIndex: number, firstName: string, amount: string, payLink: string): string {
  const linkLine = payLink ? `\n\nPay here: ${payLink}` : ''
  switch (stageIndex) {
    case 0:
      return `Hi ${firstName} — your cleaner is wrapping up and we haven't seen your payment yet. Balance: $${amount}.${linkLine}\n\nReply "paid" if you've already sent it.`
    case 1:
      return `Hi ${firstName} — following up, your balance of $${amount} is still outstanding.${linkLine}`
    case 2:
      return `Hi ${firstName} — second reminder: $${amount} is still due.${linkLine}\n\nPlease take care of this when you get a chance.`
    case 3:
      return `Hi ${firstName} — your payment of $${amount} is now several hours overdue.${linkLine}\n\nPlease settle today, thank you!`
    default:
      return `Hi ${firstName} — final reminder: $${amount} remains unpaid.${linkLine}\n\nPlease pay now to avoid any delay with future bookings.`
  }
}

export async function runPaymentReminderCadence(
  tenant: ReminderTenant,
): Promise<{ nudged: number; escalated: number }> {
  if (!tenant.telnyx_api_key || !tenant.telnyx_phone) return { nudged: 0, escalated: 0 }

  const clientNudgeOn = (await getCommPrefs(tenant.id)).comms.payment_reminder?.sms !== false

  const { data: pending } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, price, fifteen_min_alert_time, payment_reminder_sent_at, clients(name, phone)')
    .eq('tenant_id', tenant.id)
    .not('fifteen_min_alert_time', 'is', null)
    .not('payment_status', 'in', '("paid","partial")')
    .is('payment_method', null)
    .limit(200)

  let nudged = 0
  let escalated = 0
  const now = Date.now()
  const finalStageMin = STAGES_MIN[STAGES_MIN.length - 1]
  const THROTTLE_MS = 5 * 60 * 1000
  const throttleCutoff = new Date(now - THROTTLE_MS).toISOString()

  for (const booking of pending || []) {
    const client = booking.clients as unknown as { name?: string; phone?: string } | null
    if (!client?.phone || !booking.client_id) continue

    const elapsedMin = (now - new Date(booking.fifteen_min_alert_time).getTime()) / 60000

    const { count } = await supabaseAdmin
      .from('sms_logs')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', booking.id)
      .eq('sms_type', SMS_TYPE)
    const stagesSent = count || 0

    if (stagesSent < STAGES_MIN.length) {
      if (!clientNudgeOn || elapsedMin < STAGES_MIN[stagesSent]) continue

      // Atomic claim before sending — two overlapping cron invocations (a manual
      // trigger racing the real schedule, a platform retry, etc.) must not both
      // pass the stage check above and double-text the client. Two sequential
      // attempts instead of a single .or() filter, matching the proven pattern
      // in team-portal/30min-alert/route.ts (a chained .or() silently matches
      // zero rows on this Supabase/PostgREST version).
      let claimed = (
        await supabaseAdmin
          .from('bookings')
          .update({ payment_reminder_sent_at: new Date(now).toISOString() })
          .eq('id', booking.id)
          .eq('tenant_id', tenant.id)
          .is('payment_reminder_sent_at', null)
          .select('id')
          .maybeSingle()
      ).data
      if (!claimed) {
        claimed = (
          await supabaseAdmin
            .from('bookings')
            .update({ payment_reminder_sent_at: new Date(now).toISOString() })
            .eq('id', booking.id)
            .eq('tenant_id', tenant.id)
            .lt('payment_reminder_sent_at', throttleCutoff)
            .select('id')
            .maybeSingle()
        ).data
      }
      if (!claimed) continue

      const amount = booking.price ? (Number(booking.price) / 100).toFixed(2) : '0.00'
      const firstName = client.name?.split(' ')[0] || 'there'
      const text = stageText(stagesSent, firstName, amount, buildPayLink(tenant, booking.id))

      const result = await sendClientSMS(booking.client_id, text, {
        smsType: SMS_TYPE,
        bookingId: booking.id,
      }).catch(() => ({ sent: 0, skipped: 0 }))
      if (result?.sent && result.sent > 0) nudged++
      continue
    }

    if (elapsedMin < finalStageMin) continue

    // All 5 stages sent and still unpaid past the final stage — escalate once.
    // Claim by inserting the admin_tasks row FIRST, then only notify if this
    // insert turned out to be the sole row for this booking — shrinks the
    // check-then-act race from "read, then maybe write" (wide gap) down to
    // "write, then read own write" (one round trip), same failure class as
    // the client-nudge race above but lower stakes (a duplicate admin alert,
    // not a duplicate client text), so a full atomic-claim column isn't
    // warranted here.
    const amount = booking.price ? (Number(booking.price) / 100).toFixed(2) : '0.00'
    const subject = `[${tenant.name}] Payment overdue 6+ hrs — ${client.name || 'client'}`
    const body = `${client.name || 'Client'} (${client.phone}) still hasn't paid $${amount} for booking ${booking.id.slice(0, 8)}, 6+ hours after the job finished. All automated reminders have gone out — please follow up directly.`

    const { error: insertError } = await supabaseAdmin.from('admin_tasks').insert({
      tenant_id: tenant.id,
      type: ESCALATE_TASK_TYPE,
      priority: 'high',
      title: `${client.name || 'Client'} — $${amount} payment overdue 6+ hrs`,
      description: body,
      related_type: 'booking',
      related_id: booking.id,
      client_id: booking.client_id,
    })
    if (insertError) continue

    const { count: taskCount } = await supabaseAdmin
      .from('admin_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('related_id', booking.id)
      .eq('type', ESCALATE_TASK_TYPE)
    if ((taskCount || 0) > 1) continue

    await Promise.allSettled([
      tenant.telegram_chat_id && tenant.telegram_bot_token
        ? sendTelegram(tenant.telegram_chat_id, `${subject}\n\n${body}`, tenant.telegram_bot_token)
        : Promise.resolve(null),
      tenant.owner_email ? sendEmail(tenant.owner_email, subject, `<p>${body}</p>`) : Promise.resolve(),
    ])

    escalated++
  }

  return { nudged, escalated }
}
