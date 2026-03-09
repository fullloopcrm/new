import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

// 4-stage reminder cascade: 7d, 3d, 1d, 2hr before booking
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const intervals = [
    { hours: 168, label: '7 days' },   // 7 days
    { hours: 72, label: '3 days' },    // 3 days
    { hours: 24, label: 'tomorrow' },  // 1 day
    { hours: 2, label: '2 hours' },    // 2 hours
  ]

  let totalSent = 0

  for (const interval of intervals) {
    const target = new Date(now.getTime() + interval.hours * 3600 * 1000)
    const windowStart = new Date(target.getTime() - 30 * 60 * 1000) // 30 min window
    const windowEnd = new Date(target.getTime() + 30 * 60 * 1000)

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, tenant_id, client_id, service_type, start_time, clients(name, phone)')
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())

    for (const booking of bookings || []) {
      const clientName = (booking.clients as unknown as { name: string } | null)?.name || 'there'
      await notify({
        tenantId: booking.tenant_id,
        type: 'booking_reminder',
        title: `Reminder: Appointment ${interval.label}`,
        message: `Hi ${clientName}, your ${booking.service_type || 'appointment'} is ${interval.label} away on ${new Date(booking.start_time).toLocaleString()}.`,
        channel: 'sms',
        recipientType: 'client',
        recipientId: booking.client_id,
        bookingId: booking.id,
      })
      totalSent++
    }
  }

  return NextResponse.json({ reminders_sent: totalSent })
}
