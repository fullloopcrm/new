import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { getTenantTimezone, getTenantDayBoundaries, tenantCalendarToday, parseTenantNaiveString, formatCalendarNaive } from '@/lib/tenant-time'

export async function GET(request: NextRequest) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const timezone = getTenantTimezone(_authTenant.tenant)
    const db = tenantDb(tenantId) // auto-scopes the bookings reads below
    const period = request.nextUrl.searchParams.get('period') || 'month'

    const now = new Date()
    // payment_date is real timestamptz — every period boundary below must be
    // the tenant's OWN calendar day/month, not the server's (UTC).
    const todayCal = tenantCalendarToday(timezone, now)
    let dateFrom: Date

    if (period === 'today') {
      dateFrom = getTenantDayBoundaries(timezone, now).todayStart
    } else if (period === 'week') {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'month') {
      dateFrom = parseTenantNaiveString(formatCalendarNaive({ ...todayCal, day: 1 }), timezone)
    } else {
      dateFrom = parseTenantNaiveString(formatCalendarNaive({ ...todayCal, month: 0, day: 1 }), timezone) // YTD
    }

    const { data: bookings } = await db
      .from('bookings')
      .select('price, payment_date, payment_status')
      .in('payment_status', ['paid'])
      .gte('payment_date', dateFrom.toISOString())

    // Revenue total from the LEDGER (source of truth); booking count stays live.
    const nowNaiveDate = formatCalendarNaive(todayCal).slice(0, 10)
    const pnl = await ledgerProfitAndLoss(tenantId, dateFrom.toISOString().slice(0, 10), nowNaiveDate)
    const totalRevenue = pnl.revenue_cents

    const existingData = {
      period,
      total_revenue: totalRevenue,
      booking_count: bookings?.length || 0,
    }

    // Monthly revenue breakdown (last 12 months)
    if (request.nextUrl.searchParams.get('monthly') === 'true') {
      const twelveMonthsAgo = new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000)

      const { data: monthlyBookings } = await db
        .from('bookings')
        .select('price, payment_date')
        .eq('payment_status', 'paid')
        .gte('payment_date', twelveMonthsAgo.toISOString())

      const monthMap: Record<string, number> = {}
      for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: timezone })
        monthMap[key] = 0
      }

      for (const b of monthlyBookings || []) {
        if (b.payment_date) {
          const key = new Date(b.payment_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: timezone })
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
