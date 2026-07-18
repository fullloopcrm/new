/**
 * Master Budget for a single quote — get / upsert. One budget row per quote
 * (quote_budgets.quote_id is unique); jobs.quote_id links a converted job
 * back to the same quote, so this budget carries forward once the quote
 * converts — no separate per-job row.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { computeSuggestedBudget } from '@/lib/budget-template'

type Params = { params: Promise<{ quoteId: string }> }

function centsOrZero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { quoteId } = await params

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id, quote_number, title, status, total_cents, line_items, client_id, clients(id, name)')
      .eq('tenant_id', tenantId)
      .eq('id', quoteId)
      .single()
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

    const { data: budget } = await supabaseAdmin
      .from('quote_budgets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('quote_id', quoteId)
      .maybeSingle()

    // No budget set yet -- offer a suggested starting point derived from the
    // tenant's per-service-type budget templates (see
    // 2026_07_18_service_types_budget_defaults.sql), so the form pre-fills
    // instead of starting blank. Only computed when there's nothing to
    // override yet; an existing budget is never silently replaced.
    let suggested = null
    if (!budget) {
      const { data: serviceTypes } = await supabaseAdmin
        .from('service_types')
        .select('name, cost_cents, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps')
        .eq('tenant_id', tenantId)
      suggested = computeSuggestedBudget((quote.line_items as { name?: string; quantity?: number }[]) || [], serviceTypes || [])
    }

    return NextResponse.json({ quote, budget: budget || null, suggested })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/quote-budgets/[quoteId]', err)
    return NextResponse.json({ error: 'Failed to load budget' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { quoteId } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', quoteId)
      .single()
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

    const targetMarginBps = body.target_margin_bps === null || body.target_margin_bps === undefined || body.target_margin_bps === ''
      ? null
      : Math.max(0, Math.min(10000, Math.round(Number(body.target_margin_bps) || 0)))

    const { data, error } = await supabaseAdmin
      .from('quote_budgets')
      .upsert(
        {
          tenant_id: tenantId,
          quote_id: quoteId,
          labor_budget_cents: centsOrZero(body.labor_budget_cents),
          materials_budget_cents: centsOrZero(body.materials_budget_cents),
          other_budget_cents: centsOrZero(body.other_budget_cents),
          target_margin_bps: targetMarginBps,
          labor_actual_cents: centsOrZero(body.labor_actual_cents),
          materials_actual_cents: centsOrZero(body.materials_actual_cents),
          other_actual_cents: centsOrZero(body.other_actual_cents),
          notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null,
        },
        { onConflict: 'quote_id' }
      )
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json({ budget: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/quote-budgets/[quoteId]', err)
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
  }
}
