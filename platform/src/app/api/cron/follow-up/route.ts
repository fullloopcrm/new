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
    .is('thank_you_sent_at', null)

  let totalSent = 0

  for (const booking of bookings || []) {
    // Claim BEFORE sending: compare-and-swap update conditioned on
    // thank_you_sent_at still being null. Two overlapping invocations (a
    // manual re-trigger of this endpoint, or a platform-retried cron
    // delivery) racing on the same booking can no longer both send -- the
    // loser's claim affects 0 rows and it skips. Also replaces the old
    // notes-substring [THANKYOU_SENT] marker as the dedup source: any later
    // admin edit to notes (PATCH /api/bookings/:id allows it) used to
    // silently erase the marker and trigger a duplicate send on the next
    // pass -- this column is never touched by that route, so it can't
    // happen. Same bug class + fix shape as post-job-followup's
    // review_followup_sent_at fix. Distinct marker text from
    // post-job-followup's [FOLLOWUP_SENT] -- that one gates an unrelated
    // 2-hour-post-checkout SMS rating request on the same bookings.notes
    // field, and would already be present by the time this 3-day thank-you
    // runs, so reusing it would make this cron silently skip every booking.
    const nowIso = new Date().toISOString()
    const updatedNotes = booking.notes
      ? `${booking.notes}\n[THANKYOU_SENT] ${nowIso}`
      : `[THANKYOU_SENT] ${nowIso}`

    const { data: claimed } = await supabaseAdmin
      .from('bookings')
      .update({ thank_you_sent_at: nowIso, notes: updatedNotes })
      .eq('id', booking.id)
      .is('thank_you_sent_at', null)
      .select('id')

    if (!claimed || claimed.length === 0) continue // lost the race to a concurrent/overlapping invocation

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

    totalSent++
  }

  return NextResponse.json({ follow_ups_sent: totalSent })
}
