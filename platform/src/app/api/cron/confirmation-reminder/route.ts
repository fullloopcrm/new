import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { smsConfirmationReminder } from '@/lib/nycmaid/sms-templates'
import { protectCronAPI } from '@/lib/nycmaid/auth'

// Runs every 5 min. Finds bookings still status='pending' (client hasn't replied
// CONFIRM yet) that were created at least 30 min ago and have a future
// start_time, then sends one reminder SMS per booking. Dedupe via sms_logs.
export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  const { data: pending, error } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, start_time, service_type, hourly_rate, notes, clients(name, phone)')
    .eq('status', 'pending')
    .lte('created_at', thirtyMinAgo)
    .gte('start_time', nowIso)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const booking of pending || []) {
    if (!booking.client_id) continue

    // Skip bookings the client already accepted terms on — either via the
    // form recap (`[Client confirmed terms ...]`) or via SMS CONFIRM reply
    // (`[Client accepted terms ...]`). The reminder is only for true silent
    // pending — never fire it once consent is on file.
    if (typeof booking.notes === 'string' && /\[Client (confirmed|accepted) terms /.test(booking.notes)) continue

    const { count } = await supabaseAdmin
      .from('sms_logs')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', booking.id)
      .eq('sms_type', 'confirmation_reminder')

    if ((count || 0) > 0) continue

    await sendClientSMS(booking.client_id, smsConfirmationReminder(booking), {
      smsType: 'confirmation_reminder',
      bookingId: booking.id,
    })
    sent++
  }

  return NextResponse.json({ ok: true, sent, scanned: pending?.length || 0 })
}
