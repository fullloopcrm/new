import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const period = request.nextUrl.searchParams.get('period') || 'month'

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
      dateFrom = new Date(now.getFullYear(), 0, 1) // YTD
    }

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('price, payment_date, payment_status')
      .eq('tenant_id', tenantId)
      .in('payment_status', ['paid'])
      .gte('payment_date', dateFrom.toISOString())

    const totalRevenue = (bookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

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
      for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        monthMap[key] = 0
      }

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
