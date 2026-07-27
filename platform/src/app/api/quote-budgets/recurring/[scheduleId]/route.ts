/**
 * Budgets — get / upsert a single recurring_schedules row's budget. Mirrors
 * /api/quote-budgets/[quoteId] exactly, but keyed by recurring_schedule_id
 * instead of quote_id (see 2026_07_27_recurring_schedule_budgets.sql — same
 * quote_budgets/budget_line_items tables, one of the two FK columns is set).
 *
 * Exists because a real share of recurring work is set up directly by an
 * admin with no quote ever created, so the quote-only budget path left it
 * with zero budget coverage.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { fetchBudgetLineItems, replaceBudgetLineItems, targetMarginBpsFromBody, type LineItemInput } from '@/lib/finance/budget-line-items'

type Params = { params: Promise<{ scheduleId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { scheduleId } = await params

    const { data: schedule } = await supabaseAdmin
      .from('recurring_schedules')
      .select('id, recurring_type, status, hourly_rate, duration_hours, client_id, clients(id, name)')
      .eq('tenant_id', tenantId)
      .eq('id', scheduleId)
      .single()
    if (!schedule) return NextResponse.json({ error: 'Recurring schedule not found' }, { status: 404 })

    const { data: budget } = await supabaseAdmin
      .from('quote_budgets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('recurring_schedule_id', scheduleId)
      .maybeSingle()

    let budgetWithLines = null
    if (budget) {
      const lineItems = await fetchBudgetLineItems(budget.id)
      budgetWithLines = { ...budget, line_items: lineItems }
    }

    return NextResponse.json({ schedule, budget: budgetWithLines })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/quote-budgets/recurring/[scheduleId]', err)
    return NextResponse.json({ error: 'Failed to load budget' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { scheduleId } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))

    const { data: schedule } = await supabaseAdmin
      .from('recurring_schedules')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', scheduleId)
      .single()
    if (!schedule) return NextResponse.json({ error: 'Recurring schedule not found' }, { status: 404 })

    const { data: budget, error } = await supabaseAdmin
      .from('quote_budgets')
      .upsert(
        {
          tenant_id: tenantId,
          recurring_schedule_id: scheduleId,
          target_margin_bps: targetMarginBpsFromBody(body),
          notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null,
        },
        { onConflict: 'recurring_schedule_id' }
      )
      .select('*')
      .single()
    if (error) throw error

    const inputLines = Array.isArray(body.line_items) ? (body.line_items as LineItemInput[]) : []
    const lineItems = await replaceBudgetLineItems(tenantId, budget.id, inputLines)

    return NextResponse.json({ budget: { ...budget, line_items: lineItems } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/quote-budgets/recurring/[scheduleId]', err)
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
  }
}
