/**
 * Profit & Loss statement.
 * GET /api/finance/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   → revenue (paid + collected), cost-of-services (team_member_pay),
 *     expenses by category, gross + net.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'
import { ledgerProfitAndLoss } from '@/lib/finance/ledger-reports'
import { etToday, addCalendarDays, daysInCalendarMonth, formatNaiveET, type CalendarDate } from '@/lib/recurring'

// journal_entries.entry_date (the ledger path below) and bookings.start_time
// (the ?source=raw fallback) are both naive-ET -- defaulting this range from
// the server's UTC calendar shifted the default "this month" by a full
// calendar day during the ~4-5h ET-evening window, and on the LAST evening of
// any month landed on the wrong month entirely (e.g. Jul 31 11pm ET reads as
// Aug 1 UTC), showing an empty/wrong-month P&L exactly when month-end
// closing is being checked.
export function monthRangeET(): { from: string; to: string } {
  const todayCal = etToday()
  const startCal: CalendarDate = { year: todayCal.year, month: todayCal.month, day: 1 }
  const endCal = addCalendarDays(startCal, daysInCalendarMonth(startCal) - 1)
  return { from: formatNaiveET(startCal).slice(0, 10), to: formatNaiveET(endCal).slice(0, 10) }
}

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const url = new URL(request.url)
    const defaultRange = monthRangeET()
    const from = url.searchParams.get('from') || defaultRange.from
    const to = url.searchParams.get('to') || defaultRange.to
    const toTs = `${to}T23:59:59Z`
    const entityId = entityIdFromUrl(url)

    // Ledger is now the source of truth (validated to the cent against real
    // data). It also fixes the raw path's cents/dollars ×100 revenue bug.
    // Raw is retained only as an explicit `?source=raw` escape hatch.
    if (url.searchParams.get('source') !== 'raw') {
      const pnl = await ledgerProfitAndLoss(tenantId, from, to, entityId)
      return NextResponse.json(pnl)
    }

    // Revenue: paid bookings in window (by payment_date), or completed bookings with price
    let bookingsQ = supabaseAdmin
      .from('bookings')
      .select('id, price, team_member_pay, actual_hours, payment_status, payment_date, start_time, status')
      .eq('tenant_id', tenantId)
      .gte('start_time', from)
      .lte('start_time', toTs)
    if (entityId) bookingsQ = bookingsQ.eq('entity_id', entityId)
    const { data: bookings } = await bookingsQ

    let revenueCents = 0
    let costOfServiceCents = 0
    let bookingsCount = 0
    let unpaidCents = 0
    for (const b of bookings || []) {
      const priceCents = Math.round(Number(b.price || 0)) // already cents
      const payCents = Math.round(Number(b.team_member_pay || 0)) // already cents
      if (b.payment_status === 'paid' || b.payment_status === 'partial') {
        revenueCents += priceCents
        bookingsCount += 1
      } else if (b.status === 'completed') {
        unpaidCents += priceCents
      }
      if (b.status === 'completed') {
        costOfServiceCents += payCents
      }
    }

    // Expenses by category
    let expQ = supabaseAdmin
      .from('expenses')
      .select('category, amount, date, tax_deductible')
      .eq('tenant_id', tenantId)
      .gte('date', from)
      .lte('date', to)
    if (entityId) expQ = expQ.eq('entity_id', entityId)
    const { data: expenses } = await expQ

    const expenseByCategory = new Map<string, number>()
    let expensesTotalCents = 0
    let taxDeductibleCents = 0
    for (const e of expenses || []) {
      const cat = (e.category as string) || 'other'
      const amt = Number(e.amount) || 0
      expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + amt)
      expensesTotalCents += amt
      if (e.tax_deductible !== false) taxDeductibleCents += amt
    }

    const grossProfitCents = revenueCents - costOfServiceCents
    const netProfitCents = grossProfitCents - expensesTotalCents

    return NextResponse.json({
      period: { from, to },
      revenue_cents: revenueCents,
      cost_of_service_cents: costOfServiceCents,
      gross_profit_cents: grossProfitCents,
      expenses_total_cents: expensesTotalCents,
      net_profit_cents: netProfitCents,
      tax_deductible_cents: taxDeductibleCents,
      bookings_count: bookingsCount,
      unpaid_cents: unpaidCents,
      expense_by_category: Array.from(expenseByCategory.entries())
        .map(([category, amount_cents]) => ({ category, amount_cents }))
        .sort((a, b) => b.amount_cents - a.amount_cents),
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/pnl', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
