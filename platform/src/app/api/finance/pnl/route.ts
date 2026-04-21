/**
 * Profit & Loss statement.
 * GET /api/finance/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   → revenue (paid + collected), cost-of-services (team_member_pay),
 *     expenses by category, gross + net.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { entityIdFromUrl } from '@/lib/entity'

function monthStart(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) }
function monthEnd(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59)) }

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const now = new Date()
    const from = url.searchParams.get('from') || monthStart(now).toISOString().slice(0, 10)
    const to = url.searchParams.get('to') || monthEnd(now).toISOString().slice(0, 10)
    const toTs = `${to}T23:59:59Z`
    const entityId = entityIdFromUrl(url)

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
      const priceCents = Math.round(Number(b.price || 0) * 100)
      const payCents = Math.round(Number(b.team_member_pay || 0) * 100)
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
