import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

// 3-day post-service follow-up thank you
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
