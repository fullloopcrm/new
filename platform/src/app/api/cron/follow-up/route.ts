import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

// 3-day post-service follow-up thank you
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const windowStart = new Date(threeDaysAgo.getTime() - 60 * 60 * 1000)
  const windowEnd = new Date(threeDaysAgo.getTime() + 60 * 60 * 1000)

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, client_id, service_type, notes, clients(name)')
    .in('status', ['completed', 'paid'])
    .gte('check_out_time', windowStart.toISOString())
    .lte('check_out_time', windowEnd.toISOString())

  let totalSent = 0

  for (const booking of bookings || []) {
    // Unlike every sibling follow-up cron (post-job-followup's
    // [FOLLOWUP_SENT] notes marker, sales-follow-ups' notifications-based
    // dedup), this route had ZERO duplicate-send protection -- a manual
    // re-trigger of this endpoint, or a platform-retried cron delivery,
    // would re-send the "thank you + THANKYOU for 10% off" email to every
    // booking still inside the 2-hour window. Distinct marker from
    // post-job-followup's [FOLLOWUP_SENT] -- that one gates an unrelated
    // 2-hour-post-checkout SMS rating request on the same bookings.notes
    // field, and would already be present by the time this 3-day thank-you
    // runs, so reusing it would make this cron silently skip every booking.
    if (booking.notes?.includes('[THANKYOU_SENT]')) continue

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', booking.tenant_id)
      .single()

    const clientName = (booking.clients as unknown as { name: string } | null)?.name || 'there'

    await notify({
      tenantId: booking.tenant_id,
      type: 'follow_up',
      title: `Thank you from ${tenant?.name || 'us'}!`,
      message: `Hi ${clientName}, thank you for choosing ${tenant?.name}! We hope you enjoyed your ${booking.service_type || 'service'}. Book again and mention THANKYOU for 10% off your next appointment.`,
      channel: 'email',
      recipientType: 'client',
      recipientId: booking.client_id,
      bookingId: booking.id,
    })

    const updatedNotes = booking.notes
      ? `${booking.notes}\n[THANKYOU_SENT] ${new Date().toISOString()}`
      : `[THANKYOU_SENT] ${new Date().toISOString()}`
    await supabaseAdmin.from('bookings').update({ notes: updatedNotes }).eq('id', booking.id)

    totalSent++
  }

  return NextResponse.json({ follow_ups_sent: totalSent })
}
