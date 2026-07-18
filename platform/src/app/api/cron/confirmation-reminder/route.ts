import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { nowNaiveET } from '@/lib/recurring'

// Runs every 5 min. Finds bookings still status='pending' (client hasn't replied
// CONFIRM yet) that were created at least 30 min ago and have a future
// start_time, then sends one reminder SMS per booking. Dedupe via sms_logs.
//
// Multi-tenant: iterates active tenants and runs per-tenant. Tenants without
// `bookings` data (or using the team_members data model) get empty queries
// and are no-ops here.
export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  // start_time is naive-ET (see recurring.ts's nowNaiveET() header) -- a raw
  // true-UTC new Date().toISOString() here read as a later clock time than
  // the real ET instant, silently excluding any booking in the true ET/UTC
  // gap window from getting its confirmation reminder sent.
  const nowNaive = nowNaiveET()

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('status', 'active')
    .limit(1000)

  let sent = 0
  let scanned = 0

  for (const tenant of tenants || []) {
    const tenantId = tenant.id
    const clientSms = await clientSmsTemplatesFor(tenantId)

    const { data: pending, error } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, start_time, service_type, hourly_rate, notes, clients(name, phone)')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .lte('created_at', thirtyMinAgo)
      .gte('start_time', nowNaive)

    if (error) continue

    scanned += (pending || []).length

    for (const booking of pending || []) {
      if (!booking.client_id) continue

      if (typeof booking.notes === 'string' && /\[Client (confirmed|accepted) terms /.test(booking.notes)) continue

      // Claim BEFORE sending: the old dedup queried sms_logs for
      // sms_type='confirmation_reminder', but that row is only written
      // AFTER sendSMS's Telnyx call resolves (see lib/nycmaid/sms.ts) --
      // same sent-before-claim race already fixed elsewhere this session
      // (rating-prompt/payment-reminder/etc). This cron runs every 5 min
      // with no run-lock, so two overlapping invocations could both pass
      // the sms_logs check before either write landed and both text the
      // client. The conditional `.is(...)` update is atomic per-row, so
      // the losing invocation's claim affects 0 rows and it skips.
      const { data: claimed } = await supabaseAdmin
        .from('bookings')
        .update({ confirmation_reminder_sent_at: new Date().toISOString() })
        .eq('id', booking.id)
        .eq('tenant_id', tenantId)
        .is('confirmation_reminder_sent_at', null)
        .select('id')

      if (!claimed || claimed.length === 0) continue // lost the race, or already claimed by a prior run

      await sendClientSMS(booking.client_id, clientSms.confirmationReminder(booking), {
        smsType: 'confirmation_reminder',
        bookingId: booking.id,
      })
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent, scanned })
}
