import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { etYMD, etMidnightUtc } from '@/lib/dates'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const tenantId = url.searchParams.get('tenant_id')
  const period = url.searchParams.get('period') || 'month'

  // bookings.payment_date is TIMESTAMPTZ (aware) -- the old
  // `new Date().getFullYear()/getMonth()/getDate()` read the SERVER's local
  // calendar (UTC on Vercel), a full day ahead of ET for ~4-5h every
  // evening, misplacing the period boundary during that window. Fixed with
  // the true-UTC-instant of ET midnight (unlike bookings.start_time's
  // naive-ET string columns fixed elsewhere this session).
  const now = new Date()
  const { y: ty, m: tm, d: td } = etYMD(now)
  let dateFrom: Date

  if (period === 'today') {
    dateFrom = etMidnightUtc(ty, tm, td)
  } else if (period === 'week') {
    const weekAgoObj = new Date(Date.UTC(ty, tm - 1, td - 7))
    dateFrom = etMidnightUtc(weekAgoObj.getUTCFullYear(), weekAgoObj.getUTCMonth() + 1, weekAgoObj.getUTCDate())
  } else if (period === 'month') {
    dateFrom = etMidnightUtc(ty, tm, 1)
  } else {
    dateFrom = etMidnightUtc(ty, 1, 1)
  }

  let query = supabaseAdmin
    .from('bookings')
    .select('price, payment_date, payment_status, tenant_id')
    .in('payment_status', ['paid'])
    .gte('payment_date', dateFrom.toISOString())

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data: bookings } = await query

  const totalRevenue = (bookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

  // Per-tenant breakdown
  const tenantRevenue: Record<string, { revenue: number; count: number }> = {}
  for (const b of bookings || []) {
    if (!tenantRevenue[b.tenant_id]) tenantRevenue[b.tenant_id] = { revenue: 0, count: 0 }
    tenantRevenue[b.tenant_id].revenue += b.price || 0
    tenantRevenue[b.tenant_id].count++
  }

  // Get tenant names
  const tenantIds = Object.keys(tenantRevenue)
  let tenantNames: Record<string, string> = {}
  if (tenantIds.length > 0) {
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .in('id', tenantIds)
    for (const t of tenants || []) {
      tenantNames[t.id] = t.name
    }
  }

  const breakdown = Object.entries(tenantRevenue)
    .map(([id, data]) => ({
      tenant_id: id,
      tenant_name: tenantNames[id] || id.slice(0, 8),
      revenue: data.revenue,
      booking_count: data.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Monthly trend (last 12 months). Same TIMESTAMPTZ-boundary fix as
  // above for the query; bucket labels and per-payment bucketing both now
  // key off the ET calendar month instead of the server-local one.
  const twelveMonthsAgoObj = new Date(Date.UTC(ty, tm - 1 - 12, 1))
  const twelveMonthsAgo = etMidnightUtc(twelveMonthsAgoObj.getUTCFullYear(), twelveMonthsAgoObj.getUTCMonth() + 1, 1)

  let monthlyQuery = supabaseAdmin
    .from('bookings')
    .select('price, payment_date')
    .eq('payment_status', 'paid')
    .gte('payment_date', twelveMonthsAgo.toISOString())

  if (tenantId) monthlyQuery = monthlyQuery.eq('tenant_id', tenantId)

  const { data: monthlyBookings } = await monthlyQuery

  const monthMap: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const labelDate = new Date(Date.UTC(ty, tm - 1 - i, 1))
    const key = labelDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    monthMap[key] = 0
  }
  for (const b of monthlyBookings || []) {
    if (b.payment_date) {
      const key = new Date(b.payment_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'America/New_York' })
      if (key in monthMap) monthMap[key] += (b.price || 0) / 100
    }
  }

  return NextResponse.json({
    period,
    total_revenue: totalRevenue,
    booking_count: bookings?.length || 0,
    breakdown,
    monthly: Object.entries(monthMap).map(([month, amount]) => ({ month, amount })),
  })
}
