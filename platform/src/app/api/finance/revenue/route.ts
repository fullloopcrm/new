import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { buildTrailingMonthKeys } from '@/lib/finance/trailing-month-keys'
import { etToday, addCalendarDays, etDayBoundaryUTC, formatNaiveET } from '@/lib/recurring'

export async function GET(request: NextRequest) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const period = request.nextUrl.searchParams.get('period') || 'month'

    // bookings.payment_date is a true-UTC TIMESTAMPTZ, and dateFrom also feeds
    // ledgerProfitAndLoss()'s own date range below -- "today"/"this week"/
    // "this month"/"YTD" mean the ET calendar day, but building the boundary
    // via server-local getters reads UTC on Vercel instead, silently shifting
    // both the booking-count query and the P&L window by the ET/UTC gap (see
    // lib/recurring's etDayBoundaryUTC header). Distinct call site from the
    // shared lib/finance report defaults fixed earlier this session -- this
    // route computes its own dateFrom independently.
    const today = etToday()
    let dateFrom: Date

    if (period === 'today') {
      dateFrom = etDayBoundaryUTC(today)
    } else if (period === 'week') {
      dateFrom = etDayBoundaryUTC(addCalendarDays(today, -7))
    } else if (period === 'month') {
      dateFrom = etDayBoundaryUTC({ ...today, day: 1 })
    } else {
      dateFrom = etDayBoundaryUTC({ year: today.year, month: 0, day: 1 }) // YTD
    }

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('price, payment_date, payment_status')
      .eq('tenant_id', tenantId)
      .in('payment_status', ['paid'])
      .gte('payment_date', dateFrom.toISOString())

    // Revenue total from the LEDGER (source of truth); booking count stays live.
    // ledgerProfitAndLoss expects ET calendar-day strings (matches entry_date's
    // ET convention fixed elsewhere this session) -- `new Date().toISOString()`
    // reads the UTC calendar day instead, same bug as dateFrom above.
    const nowIso = formatNaiveET(today).slice(0, 10)
    const pnl = await ledgerProfitAndLoss(tenantId, dateFrom.toISOString().slice(0, 10), nowIso)
    const totalRevenue = pnl.revenue_cents

    const existingData = {
      period,
      total_revenue: totalRevenue,
      booking_count: bookings?.length || 0,
    }

    // Monthly revenue breakdown (last 12 months)
    if (request.nextUrl.searchParams.get('monthly') === 'true') {
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

      const { data: monthlyBookings } = await supabaseAdmin
        .from('bookings')
        .select('price, payment_date')
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'paid')
        .gte('payment_date', twelveMonthsAgo.toISOString())

      const monthMap: Record<string, number> = {}
      for (const key of buildTrailingMonthKeys(12)) monthMap[key] = 0

      for (const b of monthlyBookings || []) {
        if (b.payment_date) {
          const key = new Date(b.payment_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          if (key in monthMap) {
            monthMap[key] += (b.price || 0) / 100
          }
        }
      }

      return NextResponse.json({
        ...existingData,
        monthly: Object.entries(monthMap).map(([month, amount]) => ({ month, amount }))
      })
    }

    return NextResponse.json(existingData)
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
