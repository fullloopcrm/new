import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { tenantClient } from '@/lib/tenant-supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { getArAging } from '@/lib/finance/ar-aging'
import { getTotalPendingPayrollCents, getLaborCostCentsForPeriod } from '@/lib/finance/payroll-pending'

// Same "what's booked" definition the /dashboard homepage uses (SCHEDULED),
// so Finance's "Contracted YTD" and the homepage's "Jobs · YTD" agree.
const PIPELINE_STATUSES = ['pending', 'scheduled', 'confirmed', 'completed', 'in_progress']

// Paginated — a busy tenant's year can exceed Supabase's 1000-row default cap.
async function fetchYearContracted(
  db: ReturnType<typeof tenantDb>,
  startISO: string,
  endISO: string,
): Promise<{ total_cents: number; count: number }> {
  let total = 0
  let count = 0
  let offset = 0
  for (;;) {
    const { data, error } = await db
      .from('bookings')
      .select('price')
      .in('status', PIPELINE_STATUSES)
      .gte('start_time', startISO)
      .lte('start_time', endISO)
      .range(offset, offset + 999)
    if (error) throw error
    for (const b of data || []) {
      total += b.price || 0
      count++
    }
    if (!data || data.length < 1000) break
    offset += 1000
  }
  return { total_cents: total, count }
}

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    // tenantDb auto-injects  on every read below —
    // all tables here (bookings, referral_commissions, payments,
    // team_member_payouts) carry tenant_id; none are cross-tenant.
    const db = tenantDb(tenantId)
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

    const baseSelect = 'price, team_member_pay, team_member_paid'

    const [{ data: weekBookings }, { data: monthBookings }, { data: yearBookings }, { data: recentPayments }, yearContracted] = await Promise.all([
      db.from('bookings').select(baseSelect).eq('status', 'completed').gte('start_time', weekStart.toISOString()).lt('start_time', weekEnd.toISOString()),
      db.from('bookings').select(baseSelect).eq('status', 'completed').gte('start_time', monthStart.toISOString()).lte('start_time', monthEnd.toISOString()),
      db.from('bookings').select(baseSelect).eq('status', 'completed').gte('start_time', yearStart.toISOString()).lte('start_time', yearEnd.toISOString()),
      db.from('bookings').select('id, team_member_paid_at, team_member_pay, actual_hours, start_time, clients(name), team_members!bookings_team_member_id_fkey(name)').eq('status', 'completed').eq('team_member_paid', true).not('team_member_paid_at', 'is', null).order('team_member_paid_at', { ascending: false }).limit(20),
      fetchYearContracted(db, yearStart.toISOString(), yearEnd.toISOString()),
    ])

    // Revenue from the LEDGER (single source of truth, matches the books).
    // Labor is real hours × rate (getLaborCostCentsForPeriod), not raw
    // bookings.team_member_pay — see that function's docstring for why.
    const d = (x: Date) => x.toISOString().slice(0, 10)
    // Every period end above (weekEnd/monthEnd/yearEnd) is the NATURAL end of
    // that calendar period, which for the current week/month/year is in the
    // future relative to today. Some journal entries carry a future
    // entry_date (recurring revenue posted ahead of when it actually
    // happens — a real anomaly, not fixed here), so querying to the natural
    // period end would count not-yet-real revenue as already collected.
    // Cap every ledger query at today so "this week/month/year" only ever
    // reflects what's actually happened so far.
    const todayStr = d(now)
    const cappedTo = (periodEnd: Date) => (d(periodEnd) < todayStr ? d(periodEnd) : todayStr)
    const [ledgerWeek, ledgerMonth, ledgerYear, arAging, totalPendingPayrollCents, weekLaborCost, monthLaborCost, yearLaborCost] = await Promise.all([
      ledgerProfitAndLoss(tenantId, d(weekStart), cappedTo(weekEnd)),
      ledgerProfitAndLoss(tenantId, d(monthStart), cappedTo(monthEnd)),
      ledgerProfitAndLoss(tenantId, d(yearStart), cappedTo(yearEnd)),
      getArAging(tenantId),
      getTotalPendingPayrollCents(tenantId),
      // Real hours × rate, not a sum of the mostly-unset bookings.team_member_pay
      // column (same fix as pendingCleanerPayments below — see that comment).
      getLaborCostCentsForPeriod(tenantId, weekStart.toISOString(), weekEnd.toISOString()),
      getLaborCostCentsForPeriod(tenantId, monthStart.toISOString(), monthEnd.toISOString()),
      getLaborCostCentsForPeriod(tenantId, yearStart.toISOString(), yearEnd.toISOString()),
    ])

    const weekRevenue = ledgerWeek.revenue_cents
    const weekLabor = weekLaborCost.totalCents
    const weekLaborPaid = weekLaborCost.paidCents

    const monthRevenue = ledgerMonth.revenue_cents
    const monthLabor = monthLaborCost.totalCents
    const monthLaborPaid = monthLaborCost.paidCents

    const yearRevenue = ledgerYear.revenue_cents
    const yearLabor = yearLaborCost.totalCents
    const yearLaborPaid = yearLaborCost.paidCents

    // AR outstanding — same authoritative invoices+bookings aging used by
    // /api/finance/ar-aging, not a separate raw booking-price sum (that
    // used to disagree: it counted refunded completed bookings as still
    // owed and ignored unpaid invoices entirely).
    const pendingClientPayments = arAging.total_cents
    // Same hours × rate source /api/finance/payroll (the Payroll tab) uses —
    // not a sum of bookings.team_member_pay, a column that's mostly unset on
    // real bookings and undercounted what cleaners were owed by ~770x on a
    // real tenant's live data (checked against production 2026-07-27).
    const pendingCleanerPayments = totalPendingPayrollCents

    const [{ data: monthCommissions }, { data: yearCommissions }, { data: cleanerPayroll }, { data: monthStripePayments }, { data: monthPayouts }] = await Promise.all([
      db.from('referral_commissions').select('commission_cents').gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
      db.from('referral_commissions').select('commission_cents').gte('created_at', yearStart.toISOString()).lte('created_at', yearEnd.toISOString()),
      db.from('bookings').select('team_member_id, team_member_pay, team_members!bookings_team_member_id_fkey(name)').eq('status', 'completed').or('team_member_paid.is.null,team_member_paid.eq.false').not('team_member_pay', 'is', null),
      (await tenantClient(tenantId)).from('payments').select('amount_cents, tip_cents, method').eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
      db.from('team_member_payouts').select('amount_cents, instant').gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),
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
      // "Contracted" = every booked job this year regardless of payment
      // status (same SCHEDULED definition the /dashboard homepage's Jobs
      // ladder uses); "Revenue" above is ledger-recognized/collected. The
      // gap between them is real pipeline that hasn't converted to
      // recognized revenue yet — not a discrepancy to reconcile away.
      yearContracted: yearContracted.total_cents,
      yearContractedJobs: yearContracted.count,
      yearContractedGap: yearContracted.total_cents - yearRevenue,
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
