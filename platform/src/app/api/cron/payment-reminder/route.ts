/**
 * Payment reminder cron — ported from nycmaid (every 5 min).
 * Finds bookings where the 15-min alert was sent but no payment received,
 * and re-pings the client. Escalates to admin after 30 min unpaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'

export const maxDuration = 60

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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

        const lastReminder = b.payment_reminder_sent_at as string | null
        const sinceLast = lastReminder ? Date.now() - new Date(lastReminder).getTime() : Infinity
        if (sinceLast < 5 * 60 * 1000) continue // throttle 5 min

        // First reminder ≤30min — gentle nudge to client
        const alertTime = new Date(b.fifteen_min_alert_time).getTime()
        const minsSinceAlert = Math.floor((Date.now() - alertTime) / 60000)

        if (minsSinceAlert < 30) {
          if (tenant.telnyx_api_key && tenant.telnyx_phone) {
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

        await supabaseAdmin
          .from('bookings')
          .update({ payment_reminder_sent_at: new Date().toISOString() })
          .eq('id', b.id)
          .eq('tenant_id', tenantId)
      }
    } catch (e) {
      errors.push(`tenant ${tenantId}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  // Mark stale (>60min) so we stop re-reminding
  await supabaseAdmin
    .from('bookings')
    .update({ payment_reminder_sent_at: thirtyAgo })
    .neq('payment_status', 'paid')
    .lt('fifteen_min_alert_time', sixtyAgo)
    .is('payment_reminder_sent_at', null)

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({
    type: 'payment_reminder_fired',
    title: 'cron:payment-reminder',
    message: `reminded=${reminded} escalated=${escalated}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, reminded, escalated, errors: errors.length ? errors : undefined })
}
