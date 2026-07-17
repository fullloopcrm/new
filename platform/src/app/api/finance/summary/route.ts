import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { etToday, addCalendarDays, calendarDayOfWeek, daysInCalendarMonth, formatNaiveET, parseNaiveET, type CalendarDate } from '@/lib/recurring'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const now = new Date()

    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

    // bookings.start_time is naive-ET (see lib/recurring.ts's nowNaiveET
    // header); referral_commissions/payments/team_member_payouts.created_at
    // are genuinely UTC. weekStart/monthStart/yearStart above stay
    // server-local (UTC calendar on Vercel) ON PURPOSE -- they only feed
    // `d()` below for the ledger's entry_date, a date-only column that's
    // itself always written from a UTC calendar date (post-revenue.ts /
    // post-labor.ts), so querying it with a UTC-calendar boundary is
    // self-consistent; switching just the query side to ET would introduce a
    // NEW mismatch instead of fixing one (same restraint as recurring.ts's
    // booking-to-booking comparisons). The bookings/created_at boundaries
    // below are separately anchored to the ET calendar, the same day-boundary
    // bug class fixed across this session.
    const etTodayCal = etToday()
    const weekDayIdx = (calendarDayOfWeek(etTodayCal) + 6) % 7 // Mon=0
    const weekStartCal = addCalendarDays(etTodayCal, -weekDayIdx)
    const weekEndCal = addCalendarDays(weekStartCal, 7)
    const monthStartCal: CalendarDate = { year: etTodayCal.year, month: etTodayCal.month, day: 1 }
    const monthEndCal = addCalendarDays(monthStartCal, daysInCalendarMonth(monthStartCal))
    const yearStartCal: CalendarDate = { year: etTodayCal.year, month: 0, day: 1 }
    const yearEndCal: CalendarDate = { year: etTodayCal.year + 1, month: 0, day: 1 }

    const weekStartNaive = formatNaiveET(weekStartCal)
    const weekEndNaive = formatNaiveET(weekEndCal)
    const monthStartNaive = formatNaiveET(monthStartCal)
    const monthEndNaive = formatNaiveET(monthEndCal)
    const yearStartNaive = formatNaiveET(yearStartCal)
    const yearEndNaive = formatNaiveET(yearEndCal)

    const monthStartUtc = parseNaiveET(monthStartNaive).toISOString()
    const monthEndUtc = parseNaiveET(monthEndNaive).toISOString()
    const yearStartUtc = parseNaiveET(yearStartNaive).toISOString()
    const yearEndUtc = parseNaiveET(yearEndNaive).toISOString()

    const baseSelect = 'price, team_member_pay, team_member_paid'

    const [{ data: weekBookings }, { data: monthBookings }, { data: yearBookings }, { data: pendingBookings }, { data: recentPayments }] = await Promise.all([
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', weekStartNaive).lt('start_time', weekEndNaive),
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', monthStartNaive).lt('start_time', monthEndNaive),
      supabaseAdmin.from('bookings').select(baseSelect).eq('tenant_id', tenantId).eq('status', 'completed').gte('start_time', yearStartNaive).lt('start_time', yearEndNaive),
      supabaseAdmin.from('bookings').select('price, team_member_pay, payment_status, team_member_paid').eq('tenant_id', tenantId).eq('status', 'completed').or('payment_status.neq.paid,team_member_paid.neq.true'),
      supabaseAdmin.from('bookings').select('id, team_member_paid_at, team_member_pay, actual_hours, start_time, clients(name), team_members!bookings_team_member_id_fkey(name)').eq('tenant_id', tenantId).eq('status', 'completed').eq('team_member_paid', true).not('team_member_paid_at', 'is', null).order('team_member_paid_at', { ascending: false }).limit(20),
    ])

    const sum = (arr: { price?: number | null; team_member_pay?: number | null; team_member_paid?: boolean | null }[] | null, key: 'price' | 'team_member_pay') =>
      (arr || []).reduce((s, b) => s + (b[key] || 0), 0)
    const sumPaidLabor = (arr: { team_member_pay?: number | null; team_member_paid?: boolean | null }[] | null) =>
      (arr || []).filter(b => b.team_member_paid).reduce((s, b) => s + (b.team_member_pay || 0), 0)

    // Revenue from the LEDGER (single source of truth, matches the books).
    // Labor stays from bookings — it's operational owed/paid tracking.
    const d = (x: Date) => x.toISOString().slice(0, 10)
    const [ledgerWeek, ledgerMonth, ledgerYear] = await Promise.all([
      ledgerProfitAndLoss(tenantId, d(weekStart), d(weekEnd)),
      ledgerProfitAndLoss(tenantId, d(monthStart), d(monthEnd)),
      ledgerProfitAndLoss(tenantId, d(yearStart), d(yearEnd)),
    ])

    const weekRevenue = ledgerWeek.revenue_cents
    const weekLabor = sum(weekBookings, 'team_member_pay')
    const weekLaborPaid = sumPaidLabor(weekBookings)

    const monthRevenue = ledgerMonth.revenue_cents
    const monthLabor = sum(monthBookings, 'team_member_pay')
    const monthLaborPaid = sumPaidLabor(monthBookings)

    const yearRevenue = ledgerYear.revenue_cents
    const yearLabor = sum(yearBookings, 'team_member_pay')
    const yearLaborPaid = sumPaidLabor(yearBookings)

    const pendingClientPayments = (pendingBookings || []).filter(b => b.payment_status !== 'paid').reduce((s, b) => s + (b.price || 0), 0)
    const pendingCleanerPayments = (pendingBookings || []).filter(b => !b.team_member_paid).reduce((s, b) => s + (b.team_member_pay || 0), 0)

    const [{ data: monthCommissions }, { data: yearCommissions }, { data: cleanerPayroll }, { data: monthStripePayments }, { data: monthPayouts }] = await Promise.all([
      supabaseAdmin.from('referral_commissions').select('commission_cents').eq('tenant_id', tenantId).gte('created_at', monthStartUtc).lt('created_at', monthEndUtc),
      supabaseAdmin.from('referral_commissions').select('commission_cents').eq('tenant_id', tenantId).gte('created_at', yearStartUtc).lt('created_at', yearEndUtc),
      supabaseAdmin.from('bookings').select('team_member_id, team_member_pay, team_members!bookings_team_member_id_fkey(name)').eq('tenant_id', tenantId).eq('status', 'completed').or('team_member_paid.is.null,team_member_paid.eq.false').not('team_member_pay', 'is', null),
      supabaseAdmin.from('payments').select('amount_cents, tip_cents, method').eq('tenant_id', tenantId).gte('created_at', monthStartUtc).lt('created_at', monthEndUtc),
      supabaseAdmin.from('team_member_payouts').select('amount_cents, instant').eq('tenant_id', tenantId).gte('created_at', monthStartUtc).lt('created_at', monthEndUtc),
    ])

    const monthReferralCommissions = (monthCommissions || []).reduce((s, c) => s + (c.commission_cents || 0), 0)
    const yearReferralCommissions = (yearCommissions || []).reduce((s, c) => s + (c.commission_cents || 0), 0)

    const cleanerTotals: Record<string, { name: string; total: number; count: number }> = {}
    for (const b of cleanerPayroll || []) {
      if (!b.team_member_id) continue
      const cleaner = b.team_members as unknown as { name: string } | null
      if (!cleanerTotals[b.team_member_id]) cleanerTotals[b.team_member_id] = { name: cleaner?.name || 'Unknown', total: 0, count: 0 }
      cleanerTotals[b.team_member_id].total += b.team_member_pay || 0
      cleanerTotals[b.team_member_id].count++
    }

    const allPayments = monthStripePayments || []
    const stripeCollected = allPayments.reduce((s, p) => s + (p.amount_cents || 0), 0)
    const monthTips = allPayments.reduce((s, p) => s + (p.tip_cents || 0), 0)
    const monthZelle = allPayments.filter(p => p.method === 'zelle').reduce((s, p) => s + (p.amount_cents || 0), 0)
    const monthVenmo = allPayments.filter(p => p.method === 'venmo').reduce((s, p) => s + (p.amount_cents || 0), 0)
    const monthStripe = allPayments.filter(p => p.method === 'stripe').reduce((s, p) => s + (p.amount_cents || 0), 0)
    const stripePaidOut = (monthPayouts || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
    const instantPayouts = (monthPayouts || []).filter(p => p.instant).length
    const totalPayouts = (monthPayouts || []).length

    return NextResponse.json({
      weekRevenue, monthRevenue, yearRevenue,
      weekLabor, monthLabor, yearLabor,
      weekLaborPaid, monthLaborPaid, yearLaborPaid,
      weekLaborOwed: weekLabor - weekLaborPaid,
      monthLaborOwed: monthLabor - monthLaborPaid,
      yearLaborOwed: yearLabor - yearLaborPaid,
      weekJobs: weekBookings?.length || 0,
      monthJobs: monthBookings?.length || 0,
      yearJobs: yearBookings?.length || 0,
      pendingClientPayments, pendingCleanerPayments,
      monthReferralCommissions, yearReferralCommissions,
      cleanerTotals: Object.entries(cleanerTotals).map(([id, d]) => ({ team_member_id: id, name: d.name, total: d.total, count: d.count })),
      monthTips,
      payments: { collected: stripeCollected, paidOut: stripePaidOut, instantPayouts, totalPayouts, byMethod: { stripe: monthStripe, zelle: monthZelle, venmo: monthVenmo } },
      stripe: { collected: stripeCollected, paidOut: stripePaidOut, instantPayouts, totalPayouts },
      recentPayments: (recentPayments || []).map(b => {
        const client = b.clients as unknown as { name: string } | null
        const cleaner = b.team_members as unknown as { name: string } | null
        return {
          id: b.id,
          team_member_paid_at: b.team_member_paid_at,
          team_member_pay: b.team_member_pay || 0,
          actual_hours: b.actual_hours || 0,
          start_time: b.start_time,
          client_name: client?.name || 'Unknown',
          cleaner_name: cleaner?.name || 'Unknown',
        }
      }),
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
