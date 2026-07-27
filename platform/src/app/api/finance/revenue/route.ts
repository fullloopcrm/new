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

    // Calendar-year monthly breakdown, Jan through the current month, ledger-
    // sourced per month (not raw bookings — same ledger-truth rule as the
    // headline total above). Months after the current one are "pending": no
    // actual yet, with a forecast so the trailing chart shows a full year
    // instead of stopping dead at today. Forecast method is deliberately
    // simple (average of this year's completed months) — flagged as a
    // starting point, not a real forecasting model.
    if (request.nextUrl.searchParams.get('monthly') === 'true') {
      const year = todayCal.year
      const currentMonthIndex = todayCal.month // 0-indexed, matches todayCal.month usage above

      const monthBounds = (m: number) => {
        const from = `${year}-${String(m + 1).padStart(2, '0')}-01`
        const lastDay = new Date(year, m + 1, 0).getDate()
        const to = `${year}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        return { from, to }
      }
      const monthLabel = (m: number) => new Date(Date.UTC(year, m, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })

      const actuals = await Promise.all(
        Array.from({ length: currentMonthIndex + 1 }, (_, m) => monthBounds(m)).map(({ from, to }) =>
          ledgerProfitAndLoss(tenantId, from, to).then((p) => p.revenue_cents / 100),
        ),
      )

      const completedActuals = actuals.slice(0, currentMonthIndex) // strictly before the in-progress current month
      const avgCompleted = completedActuals.length > 0 ? completedActuals.reduce((s, v) => s + v, 0) / completedActuals.length : null

      const monthly = Array.from({ length: 12 }, (_, m) => {
        const isPending = m > currentMonthIndex
        const isCurrent = m === currentMonthIndex
        return {
          month: monthLabel(m),
          actual: isPending ? null : actuals[m],
          forecast: isCurrent || isPending ? avgCompleted : null,
          isPending,
          isCurrent,
        }
      })

      const pendingCount = monthly.filter((m) => m.isPending).length
      const ytdActual = actuals.reduce((s, v) => s + v, 0)
      const projectedFullYearRevenue = avgCompleted != null ? ytdActual + avgCompleted * pendingCount : null

      return NextResponse.json({
        ...existingData,
        monthly,
        forecastMethod: 'average of completed months this year',
        ytdActual,
        projectedFullYearRevenue,
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
