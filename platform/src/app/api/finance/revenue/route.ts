import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { etYMD, etMidnightUtc } from '@/lib/dates'

export async function GET(request: NextRequest) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const period = request.nextUrl.searchParams.get('period') || 'month'

    // bookings.payment_date is TIMESTAMPTZ (aware); journal_entries.entry_date
    // (read by ledgerProfitAndLoss) is a plain DATE. The old
    // `new Date().getFullYear()/getMonth()/getDate()` read the SERVER's
    // local calendar (UTC on Vercel), a full day ahead of ET for ~4-5h
    // every evening, misplacing both boundaries during that window. Fixed
    // with the true-UTC-instant of ET midnight for the aware column
    // (unlike bookings.start_time's naive-ET string columns fixed
    // elsewhere this session) and a plain ET calendar-date string for the
    // DATE column (no instant/timezone conversion needed there at all).
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const { y: ty, m: tm, d: td } = etYMD(now)
    const todayDateStr = `${ty}-${pad(tm)}-${pad(td)}`
    let dateFrom: Date
    let dateFromDateStr: string

    if (period === 'today') {
      dateFrom = etMidnightUtc(ty, tm, td)
      dateFromDateStr = todayDateStr
    } else if (period === 'week') {
      const weekAgoObj = new Date(Date.UTC(ty, tm - 1, td - 7))
      dateFrom = etMidnightUtc(weekAgoObj.getUTCFullYear(), weekAgoObj.getUTCMonth() + 1, weekAgoObj.getUTCDate())
      dateFromDateStr = `${weekAgoObj.getUTCFullYear()}-${pad(weekAgoObj.getUTCMonth() + 1)}-${pad(weekAgoObj.getUTCDate())}`
    } else if (period === 'month') {
      dateFrom = etMidnightUtc(ty, tm, 1)
      dateFromDateStr = `${ty}-${pad(tm)}-01`
    } else {
      dateFrom = etMidnightUtc(ty, 1, 1) // YTD
      dateFromDateStr = `${ty}-01-01`
    }

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('price, payment_date, payment_status')
      .eq('tenant_id', tenantId)
      .in('payment_status', ['paid'])
      .gte('payment_date', dateFrom.toISOString())

    // Revenue total from the LEDGER (source of truth); booking count stays live.
    const pnl = await ledgerProfitAndLoss(tenantId, dateFromDateStr, todayDateStr)
    const totalRevenue = pnl.revenue_cents

    const existingData = {
      period,
      total_revenue: totalRevenue,
      booking_count: bookings?.length || 0,
    }

    // Monthly revenue breakdown (last 12 months). Same TIMESTAMPTZ-boundary
    // fix as above for the query; bucket labels and per-payment bucketing
    // both now key off the ET calendar month instead of the server-local
    // one, so a payment near a month seam lands in the right ET bucket.
    if (request.nextUrl.searchParams.get('monthly') === 'true') {
      const twelveMonthsAgoObj = new Date(Date.UTC(ty, tm - 1 - 12, 1))
      const twelveMonthsAgo = etMidnightUtc(twelveMonthsAgoObj.getUTCFullYear(), twelveMonthsAgoObj.getUTCMonth() + 1, 1)

      const { data: monthlyBookings } = await supabaseAdmin
        .from('bookings')
        .select('price, payment_date')
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'paid')
        .gte('payment_date', twelveMonthsAgo.toISOString())

      const monthMap: Record<string, number> = {}
      for (let i = 11; i >= 0; i--) {
        const labelDate = new Date(Date.UTC(ty, tm - 1 - i, 1))
        const key = labelDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
        monthMap[key] = 0
      }

      for (const b of monthlyBookings || []) {
        if (b.payment_date) {
          const key = new Date(b.payment_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'America/New_York' })
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
