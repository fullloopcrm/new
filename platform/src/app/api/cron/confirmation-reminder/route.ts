import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { toNaiveET } from '@/lib/dates'

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

  // created_at is TIMESTAMPTZ (aware) -- a real UTC instant is correct here.
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  // bookings.start_time is naive-ET (no tz). A raw `.toISOString()` bound is
  // a real UTC instant -- Postgres drops the tz marker for a `timestamp
  // without time zone` column, so the UTC clock digits were read as if they
  // were ET clock digits, shifting this lower bound LATER by the EST/EDT
  // offset. Net effect: any pending booking starting within the next ~4-5h
  // fell below the shifted bound and silently stopped being considered for
  // its confirmation-reminder SMS -- right when confirmation matters most.
  const nowEt = toNaiveET(new Date())

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
      .gte('start_time', nowEt)

    if (error) continue

    scanned += (pending || []).length

    for (const booking of pending || []) {
      if (!booking.client_id) continue

      if (typeof booking.notes === 'string' && /\[Client (confirmed|accepted) terms /.test(booking.notes)) continue

      const { count } = await supabaseAdmin
        .from('sms_logs')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('booking_id', booking.id)
        .eq('sms_type', 'confirmation_reminder')

      if ((count || 0) > 0) continue

      await sendClientSMS(booking.client_id, clientSms.confirmationReminder(booking), {
        smsType: 'confirmation_reminder',
        bookingId: booking.id,
      })
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent, scanned })
}
