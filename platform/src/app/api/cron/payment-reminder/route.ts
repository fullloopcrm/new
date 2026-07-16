/**
 * Payment reminder cron — ported from nycmaid (every 5 min).
 * Finds bookings where the 15-min alert was sent but no payment received,
 * and re-pings the client. Escalates to admin after 30 min unpaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getCommPrefs } from '@/lib/comms-prefs'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { runNycMaidPaymentReminder } from '@/lib/nycmaid/payment-reminder'
import { safeEqual } from '@/lib/secret-compare'

export const maxDuration = 60

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const fifteenAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
  const thirtyAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const sixtyAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

  let reminded = 0
  let escalated = 0
  const errors: string[] = []

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, owner_phone, phone')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    const tenantId = tenant.id

    // NYC Maid runs the faithful 2-stage flow (+15 nudge / +60 escalate) with
    // the correct "still owes" filter (excludes partial + payment_method set).
    // Tenant-scoped parity; other tenants keep the generic logic below.
    if (isNycMaid(tenantId)) {
      const r = await runNycMaidPaymentReminder(tenantId)
      reminded += r.nudges
      escalated += r.flagged
      continue
    }

    // Client payment nudge is gated by the payment_reminder SMS toggle; the
    // owner overdue-escalation stays ungated (operational alert).
    const payPrefs = await getCommPrefs(tenantId)
    const clientNudgeOn = payPrefs.comms.payment_reminder?.sms !== false

    try {
      // Bookings where alert fired 15-60 min ago and still unpaid.
      const { data: pending } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, payment_reminder_sent_at, fifteen_min_alert_time, clients(name, phone)')
        .eq('tenant_id', tenantId)
        .neq('payment_status', 'paid')
        .not('fifteen_min_alert_time', 'is', null)
        .lte('fifteen_min_alert_time', fifteenAgo)
        .gte('fifteen_min_alert_time', sixtyAgo)
        .limit(100)

      for (const b of pending || []) {
        const client = b.clients as unknown as { name?: string; phone?: string } | null
        if (!client?.phone) continue

        // Claim BEFORE sending: this cron runs every 5 min (throttle window),
        // and a slow run (or a manual re-trigger overlapping a scheduled one)
        // could still see the same stale payment_reminder_sent_at on both
        // invocations and double-text the client / double-escalate to the
        // owner. Two-step conditional UPDATE (IS NULL, then < cutoff) claims
        // the row atomically — the loser's WHERE clause matches 0 rows.
        // (.or() isn't used because a single `.lt()`/`.is()` claim is enough
        // and keeps this testable against the in-memory fake.)
        const nowIso = new Date().toISOString()
        const cutoffIso = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        let claim = await supabaseAdmin
          .from('bookings')
          .update({ payment_reminder_sent_at: nowIso })
          .eq('id', b.id)
          .eq('tenant_id', tenantId)
          .is('payment_reminder_sent_at', null)
          .select('id')
        if (!claim.data || claim.data.length === 0) {
          claim = await supabaseAdmin
            .from('bookings')
            .update({ payment_reminder_sent_at: nowIso })
            .eq('id', b.id)
            .eq('tenant_id', tenantId)
            .lt('payment_reminder_sent_at', cutoffIso)
            .select('id')
        }
        if (!claim.data || claim.data.length === 0) continue // claimed by a concurrent run

        // First reminder ≤30min — gentle nudge to client
        const alertTime = new Date(b.fifteen_min_alert_time).getTime()
        const minsSinceAlert = Math.floor((Date.now() - alertTime) / 60000)

        if (minsSinceAlert < 30) {
          if (clientNudgeOn && tenant.telnyx_api_key && tenant.telnyx_phone) {
            await sendSMS({
              to: client.phone,
              body: `Hi ${client.name?.split(' ')[0] || 'there'} — just following up on your payment for today's service. Let us know if you need the link resent. 😊`,
              telnyxApiKey: tenant.telnyx_api_key,
              telnyxPhone: tenant.telnyx_phone,
            }).catch(() => {})
            reminded++
          }
        } else {
          // Escalate to admin past 30 min
          const adminPhone = tenant.owner_phone || tenant.phone
          if (adminPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
            await sendSMS({
              to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
              body: `[${tenant.name}] PAYMENT OVERDUE — ${client.name || 'client'} (${client.phone}) — booking ${b.id.slice(0, 8)}, ${minsSinceAlert} min past alert.`,
              telnyxApiKey: tenant.telnyx_api_key,
              telnyxPhone: tenant.telnyx_phone,
            }).catch(() => {})

            await supabaseAdmin.from('admin_tasks').insert({
              tenant_id: tenantId,
              type: 'payment_overdue',
              priority: 'high',
              title: `Overdue payment — ${client.name || 'client'}`,
              description: `Booking ${b.id} unpaid ${minsSinceAlert} min past 15-min alert.`,
              related_type: 'booking',
              related_id: b.id,
            })
            escalated++
          }
        }
      }
    } catch (e) {
      errors.push(`tenant ${tenantId}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  // Mark stale (>60min) so we stop re-reminding
  await supabaseAdmin
    .from('bookings')  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    .update({ payment_reminder_sent_at: thirtyAgo })
    .neq('payment_status', 'paid')
    .lt('fifteen_min_alert_time', sixtyAgo)
    .is('payment_reminder_sent_at', null)

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'payment_reminder_fired',
    title: 'cron:payment-reminder',
    message: `reminded=${reminded} escalated=${escalated}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, reminded, escalated, errors: errors.length ? errors : undefined })
}
