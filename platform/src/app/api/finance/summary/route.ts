import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { etToday, addCalendarDays, calendarDayOfWeek, daysInCalendarMonth, formatNaiveET, parseNaiveET, type CalendarDate } from '@/lib/recurring'

/**
 * journal_entries.entry_date is naive-ET (post-revenue.ts/post-labor.ts/
 * post-adjustments.ts all write it via nowNaiveET()) -- these are the
 * ledger P&L's [from, to] bounds, ET-anchored and date-only (`.lte()`).
 * month/year use the route's pre-existing INCLUSIVE-last-day convention;
 * week keeps its own pre-existing exclusive-bound-as-`.lte()` shape.
 */
export function ledgerRangesET(): { week: [string, string]; month: [string, string]; year: [string, string] } {
  const etTodayCal = etToday()
  const weekDayIdx = (calendarDayOfWeek(etTodayCal) + 6) % 7 // Mon=0
  const weekStartCal = addCalendarDays(etTodayCal, -weekDayIdx)
  const weekEndCal = addCalendarDays(weekStartCal, 7)
  const monthStartCal: CalendarDate = { year: etTodayCal.year, month: etTodayCal.month, day: 1 }
  const monthEndCal = addCalendarDays(monthStartCal, daysInCalendarMonth(monthStartCal))
  const yearStartCal: CalendarDate = { year: etTodayCal.year, month: 0, day: 1 }
  const yearEndCal: CalendarDate = { year: etTodayCal.year + 1, month: 0, day: 1 }
  const dCal = (c: CalendarDate) => formatNaiveET(c).slice(0, 10)
  return {
    week: [dCal(weekStartCal), dCal(weekEndCal)],
    month: [dCal(monthStartCal), dCal(addCalendarDays(monthEndCal, -1))],
    year: [dCal(yearStartCal), dCal(addCalendarDays(yearEndCal, -1))],
  }
}

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant

    // bookings.start_time is naive-ET (see lib/recurring.ts's nowNaiveET
    // header); referral_commissions/payments/team_member_payouts.created_at
    // are genuinely UTC; journal_entries.entry_date (the ledger P&L's basis
    // below) is ALSO naive-ET as of this session's ledger-posting fix
    // (post-revenue.ts/post-labor.ts/post-adjustments.ts all write it via
    // nowNaiveET()) -- so every boundary here is anchored to the ET calendar,
    // reusing the same *Cal values for both the bookings query and the
    // ledger query instead of re-deriving a second, UTC-anchored set.
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
    const ledgerRanges = ledgerRangesET()
    const [ledgerWeek, ledgerMonth, ledgerYear] = await Promise.all([
      ledgerProfitAndLoss(tenantId, ...ledgerRanges.week),
      ledgerProfitAndLoss(tenantId, ...ledgerRanges.month),
      ledgerProfitAndLoss(tenantId, ...ledgerRanges.year),
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

    const pendingBookingClientPayments = (pendingBookings || []).filter(b => b.payment_status !== 'paid').reduce((s, b) => s + (b.price || 0), 0)
    const pendingCleanerPayments = (pendingBookings || []).filter(b => !b.team_member_paid).reduce((s, b) => s + (b.team_member_pay || 0), 0)

    // Jobs/Projects money owed lives on job_payments (deposit/progress/final),
    // a separate table from bookings -- a job's own session bookings carry no
    // price (see lib/jobs.ts), so the bookings-only query above silently
    // undercounts "outstanding" for any tenant running Jobs/Projects. Only
    // 'invoiced' is real money currently due; 'pending' hasn't been released
    // yet (nothing to collect), 'paid'/'void' aren't owed.
    const { data: pendingJobPayments } = await supabaseAdmin
      .from('job_payments')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('status', 'invoiced')
    const pendingJobClientPayments = (pendingJobPayments || []).reduce((s, p) => s + (Number(p.amount_cents) || 0), 0)
    const pendingClientPayments = pendingBookingClientPayments + pendingJobClientPayments

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
