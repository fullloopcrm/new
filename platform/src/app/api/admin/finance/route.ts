import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const tenantId = url.searchParams.get('tenant_id')
  const period = url.searchParams.get('period') || 'month'

  const now = new Date()
  let dateFrom: Date

  if (period === 'today') {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (period === 'week') {
    dateFrom = new Date(now)
    dateFrom.setDate(dateFrom.getDate() - 7)
  } else if (period === 'month') {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    dateFrom = new Date(now.getFullYear(), 0, 1)
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

  // Monthly trend (last 12 months)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  let monthlyQuery = supabaseAdmin
    .from('bookings')
    .select('price, payment_date')
    .eq('payment_status', 'paid')
    .gte('payment_date', twelveMonthsAgo.toISOString())

  if (tenantId) monthlyQuery = monthlyQuery.eq('tenant_id', tenantId)

  const { data: monthlyBookings } = await monthlyQuery

  const monthMap: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    monthMap[key] = 0
  }
  for (const b of monthlyBookings || []) {
    if (b.payment_date) {
      const key = new Date(b.payment_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
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
