import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { isValidCategoryForType, type FinanceType } from '@/lib/company-finance'

const ROW_CAP = 500

interface TxnRow {
  type: FinanceType
  amount_cents: number
  occurred_on: string
}

function monthBounds(offsetMonths: number, now: Date): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { from: iso(from), to: iso(to) }
}

function sumByType(rows: TxnRow[], type: FinanceType, from?: string, to?: string): number {
  return rows
    .filter((r) => r.type === type && (!from || r.occurred_on >= from) && (!to || r.occurred_on <= to))
    .reduce((s, r) => s + r.amount_cents, 0)
}

// GET /api/admin/company/finance — Full Loop's own P&L (not tenant revenue).
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const now = new Date()
  const thisMonth = monthBounds(0, now)
  const lastMonth = monthBounds(-1, now)

  const [{ data: rows, error: rowsError }, { data: allTypeAmounts, error: allError }] = await Promise.all([
    supabaseAdmin
      .from('platform_finance_transactions')
      .select('id, type, category, amount_cents, occurred_on, description, tenant_id, source, created_at, tenants(name)')
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(ROW_CAP),
    supabaseAdmin.from('platform_finance_transactions').select('type, amount_cents, occurred_on'),
  ])

  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 })
  if (allError) return NextResponse.json({ error: allError.message }, { status: 500 })

  const all = (allTypeAmounts || []) as TxnRow[]
  const totalRevenue = sumByType(all, 'revenue')
  const totalExpense = sumByType(all, 'expense')
  const thisMonthRevenue = sumByType(all, 'revenue', thisMonth.from, thisMonth.to)
  const thisMonthExpense = sumByType(all, 'expense', thisMonth.from, thisMonth.to)
  const lastMonthRevenue = sumByType(all, 'revenue', lastMonth.from, lastMonth.to)
  const lastMonthExpense = sumByType(all, 'expense', lastMonth.from, lastMonth.to)

  return NextResponse.json({
    transactions: rows || [],
    truncated: (rows || []).length >= ROW_CAP,
    summary: {
      totalRevenueCents: totalRevenue,
      totalExpenseCents: totalExpense,
      netCents: totalRevenue - totalExpense,
      thisMonthRevenueCents: thisMonthRevenue,
      thisMonthExpenseCents: thisMonthExpense,
      thisMonthNetCents: thisMonthRevenue - thisMonthExpense,
      lastMonthRevenueCents: lastMonthRevenue,
      lastMonthExpenseCents: lastMonthExpense,
      lastMonthNetCents: lastMonthRevenue - lastMonthExpense,
    },
  })
}

// POST /api/admin/company/finance  { type, category, amount_cents, occurred_on, description?, tenant_id? }
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const payload = await req.json().catch(() => null) as {
    type?: FinanceType
    category?: string
    amount_cents?: number
    occurred_on?: string
    description?: string | null
    tenant_id?: string | null
  } | null

  if (!payload?.type || (payload.type !== 'revenue' && payload.type !== 'expense')) {
    return NextResponse.json({ error: 'type must be "revenue" or "expense"' }, { status: 400 })
  }
  if (!payload.category || !isValidCategoryForType(payload.type, payload.category)) {
    return NextResponse.json({ error: 'invalid category for this type' }, { status: 400 })
  }
  if (!Number.isInteger(payload.amount_cents) || (payload.amount_cents as number) <= 0) {
    return NextResponse.json({ error: 'amount_cents must be a positive integer' }, { status: 400 })
  }
  if (!payload.occurred_on || Number.isNaN(new Date(payload.occurred_on).getTime())) {
    return NextResponse.json({ error: 'occurred_on must be a valid date' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('platform_finance_transactions')
    .insert({
      type: payload.type,
      category: payload.category,
      amount_cents: payload.amount_cents,
      occurred_on: payload.occurred_on,
      description: payload.description?.trim() || null,
      tenant_id: payload.type === 'revenue' ? payload.tenant_id || null : null,
      source: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data })
}
