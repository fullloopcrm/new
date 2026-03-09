import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

// Morning daily summary to tenant owner
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('status', 'active')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let totalSent = 0

  for (const tenant of tenants || []) {
    // Today's bookings
    const { count: todaysJobs } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .not('status', 'eq', 'cancelled')

    // Yesterday's revenue
    const { data: paidBookings } = await supabaseAdmin
      .from('bookings')
      .select('price')
      .eq('tenant_id', tenant.id)
      .gte('payment_date', yesterday.toISOString())
      .lt('payment_date', today.toISOString())

    const yesterdayRevenue = (paidBookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

    const message = [
      `Good morning from ${tenant.name}!`,
      `Today's jobs: ${todaysJobs || 0}`,
      `Yesterday's revenue: $${(yesterdayRevenue / 100).toFixed(2)}`,
    ].join('\n')

    await notify({
      tenantId: tenant.id,
      type: 'daily_summary',
      title: `Daily Summary — ${tenant.name}`,
      message,
      channel: 'email',
      recipientType: 'admin',
    })
    totalSent++
  }

  return NextResponse.json({ summaries_sent: totalSent })
}
