import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/client-contacts'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { isCommEnabled } from '@/lib/comms-prefs'
import { nowNaiveET } from '@/lib/recurring'

// Runs every 5 min. Finds bookings still status='pending' (client hasn't replied
// CONFIRM yet) that were created at least 30 min ago and have a future
// start_time, then sends one reminder SMS per booking. Dedupe via `notifications`
// (tenant_id + booking_id + type), same pattern as cron/reminders' 2hr reminder.
//
// Multi-tenant: iterates active tenants and runs per-tenant, through each
// tenant's OWN Telnyx credentials — tenants without their own creds are
// skipped rather than borrowing another tenant's account. (Previously this
// routed every tenant's send through `@/lib/nycmaid/client-contacts`, a
// pre-multi-tenant helper hardcoded to nycmaid's own Telnyx account AND
// whose sms_logs rows were hardcoded to nycmaid's tenant_id — so the dedupe
// check below, which filtered by the real tenantId, never matched and every
// eligible booking got re-texted on every 5-minute tick, forever, billed to
// and sent from nycmaid's number. Fixed 2026-07-24.)
export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  // start_time is naive ET — a real-instant boundary here excluded
  // this-morning's still-pending bookings from getting a confirmation
  // reminder for hours after they'd actually happened (same bug as
  // cron/no-show-check).
  const nowIso = `${nowNaiveET()}Z`

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone')
    .eq('status', 'active')
    .limit(1000)

  let sent = 0
  let scanned = 0

  for (const tenant of tenants || []) {
    const tenantId = tenant.id
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue
    if (!(await isCommEnabled(tenantId, 'confirmation_reminder', 'sms'))) continue
    const clientSms = await clientSmsTemplatesFor(tenantId)

    const { data: pending, error } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, start_time, service_type, hourly_rate, notes, clients(name, phone)')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .lte('created_at', thirtyMinAgo)
      .gte('start_time', nowIso)

    if (error) continue

    scanned += (pending || []).length

    for (const booking of pending || []) {
      if (!booking.client_id) continue

      if (typeof booking.notes === 'string' && /\[Client (confirmed|accepted) terms /.test(booking.notes)) continue

      const { count } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('booking_id', booking.id)
        .eq('type', 'confirmation_reminder')

      if ((count || 0) > 0) continue

      const result = await sendClientSMS(tenant, booking.client_id, clientSms.confirmationReminder(booking))
      if (result.sent > 0) {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'confirmation_reminder',
          title: 'Confirmation reminder sent',
          message: `Sent to client for booking ${booking.id}`,
          booking_id: booking.id,
          channel: 'sms',
          recipient_type: 'client',
          recipient_id: booking.client_id,
          status: 'sent',
        })
        sent++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, scanned })
}
