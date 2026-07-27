/**
 * Master Budget — list recurring_schedules with their budget (if set),
 * tenant-scoped. Sibling to /api/quote-budgets (which lists quotes) so the
 * Budgets page can show both parent types in one place.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 200)

    let q = supabaseAdmin
      .from('recurring_schedules')
      .select('id, recurring_type, status, hourly_rate, duration_hours, client_id, created_at, clients(id, name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) q = q.eq('status', status)

    const { data: schedules, error: schedulesErr } = await q
    if (schedulesErr) throw schedulesErr

    const scheduleIds = (schedules || []).map((s) => s.id)
    const { data: budgets, error: budgetsErr } = scheduleIds.length
      ? await supabaseAdmin
          .from('quote_budgets')
          .select('*')
          .eq('tenant_id', tenantId)
          .in('recurring_schedule_id', scheduleIds)
      : { data: [], error: null }
    if (budgetsErr) throw budgetsErr

    const budgetIds = (budgets || []).map((b) => b.id)
    const { data: lineItems } = budgetIds.length
      ? await supabaseAdmin.from('budget_line_items').select('quote_budget_id, budgeted_cents, actual_cents').in('quote_budget_id', budgetIds)
      : { data: [] }
    const totalsByBudget = new Map<string, { budgeted_cents: number; actual_cents: number }>()
    for (const li of lineItems || []) {
      const cur = totalsByBudget.get(li.quote_budget_id) || { budgeted_cents: 0, actual_cents: 0 }
      totalsByBudget.set(li.quote_budget_id, { budgeted_cents: cur.budgeted_cents + li.budgeted_cents, actual_cents: cur.actual_cents + li.actual_cents })
    }

    const budgetBySchedule = new Map(
      (budgets || []).map((b) => [b.recurring_schedule_id, { ...b, ...(totalsByBudget.get(b.id) || { budgeted_cents: 0, actual_cents: 0 }) }]),
    )
    const rows = (schedules || []).map((s) => ({ ...s, budget: budgetBySchedule.get(s.id) || null }))

    return NextResponse.json({ schedules: rows })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/quote-budgets/recurring', err)
    return NextResponse.json({ error: 'Failed to load recurring budgets' }, { status: 500 })
  }
}
