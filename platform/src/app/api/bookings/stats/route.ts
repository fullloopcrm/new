import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { nowNaiveET, etDayBoundaryUTC, etToday } from '@/lib/recurring'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    // bookings.start_time is a naive America/New_York wall-clock column — a
    // real UTC instant's .toISOString() compared its DIGITS literally against
    // it, silently reading "now"/"this month" up to 4-5h later than actual ET
    // time (the same bug that flipped a 10am ET booking to no-show at 6:45am
    // ET — see cron/no-show-check). Naive ET digits + a bare 'Z' instead.
    const nowNaiveBound = `${nowNaiveET()}Z`
    const todayCal = etToday()
    const monthStart = etDayBoundaryUTC({ ...todayCal, day: 1 }).toISOString()
    const weekEndNaiveBound = `${nowNaiveET(7 * 24 * 60 * 60 * 1000)}Z`

    const [
      { count: upcoming },
      { count: thisWeek },
      { count: completed },
      { data: paidBookings },
    ] = await Promise.all([
      db.from('bookings').select('id', { count: 'exact', head: true })
        .in('status', ['scheduled', 'confirmed']),
      db.from('bookings').select('id', { count: 'exact', head: true })
        .gte('start_time', nowNaiveBound).lt('start_time', weekEndNaiveBound),
      db.from('bookings').select('id', { count: 'exact', head: true })
        .in('status', ['completed', 'paid']).gte('start_time', monthStart),
      db.from('bookings').select('price')
        .eq('payment_status', 'paid').gte('payment_date', monthStart) as unknown as { data: { price: number | null }[] | null },
    ])

    const revenue = (paidBookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

    return NextResponse.json({
      upcoming: upcoming || 0,
      thisWeek: thisWeek || 0,
      completed: completed || 0,
      revenue,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ upcoming: 0, thisWeek: 0, completed: 0, revenue: 0 })
  }
}
