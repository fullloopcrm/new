import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { safeEqual } from '@/lib/secret-compare'

// 3-day post-service follow-up thank you
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const windowStart = new Date(threeDaysAgo.getTime() - 60 * 60 * 1000)
  const windowEnd = new Date(threeDaysAgo.getTime() + 60 * 60 * 1000)

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, client_id, service_type, clients(name)')
    .in('status', ['completed', 'paid'])
    .gte('check_out_time', windowStart.toISOString())
    .lte('check_out_time', windowEnd.toISOString())

  let totalSent = 0

  for (const booking of bookings || []) {
    // Dedup: this cron has no other guard at all — a manual re-trigger on
    // the same day (or a scheduler retry) would otherwise re-notify() every
    // booking in today's window a second time, resending the "thank you /
    // use THANKYOU for 10% off" email. Skip if we've already sent a
    // follow_up for this booking, same dedup shape as the confirmations
    // cron's team/client confirm-request checks.
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('tenant_id', booking.tenant_id)
      .eq('booking_id', booking.id)
      .eq('type', 'follow_up')
      .limit(1)
    if (existing && existing.length > 0) continue

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
