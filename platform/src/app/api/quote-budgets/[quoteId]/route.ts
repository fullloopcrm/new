/**
 * Master Budget for a single quote — get / upsert. One budget row per quote
 * (quote_budgets.quote_id is unique); jobs.quote_id links a converted job
 * back to the same quote, so this budget carries forward once the quote
 * converts — no separate per-job row.
 *
 * Budget line items (see 2026_07_21_budget_line_items.sql) are an open list
 * instead of 3 fixed labor/materials/other columns, each optionally tagged
 * to the shared categories tree -- so a tenant can add "Permit Fees" or
 * "Equipment Depreciation Allocation" as a real line instead of stuffing
 * everything into "Other".
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { computeSuggestedBudget, fetchMaterialsByServiceType } from '@/lib/budget-template'

type Params = { params: Promise<{ quoteId: string }> }

type LineItemInput = {
  category_id?: string | null
  label?: string
  kind?: string
  budgeted_cents?: number
  actual_cents?: number
}

function centsOrZero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}
const VALID_KINDS = ['labor', 'materials', 'other']

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

    let budgetWithLines = null
    if (budget) {
      const { data: lineItems } = await supabaseAdmin
        .from('budget_line_items')
        .select('id, category_id, label, kind, budgeted_cents, actual_cents, sort_order')
        .eq('quote_budget_id', budget.id)
        .order('sort_order', { ascending: true })
      budgetWithLines = { ...budget, line_items: lineItems || [] }
    }

    // No budget set yet -- offer a suggested starting point derived from the
    // tenant's per-service-type budget templates (see
    // 2026_07_18_service_types_budget_defaults.sql), so the form pre-fills
    // instead of starting blank. Only computed when there's nothing to
    // override yet; an existing budget is never silently replaced.
    let suggested = null
    if (!budget) {
      const { data: serviceTypes } = await supabaseAdmin
        .from('service_types')
        .select('id, name, cost_cents, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps')
        .eq('tenant_id', tenantId)
      const materialsByServiceType = await fetchMaterialsByServiceType(tenantId, (serviceTypes || []).map((s) => s.id))
      const s = computeSuggestedBudget((quote.line_items as { name?: string; quantity?: number }[]) || [], serviceTypes || [], materialsByServiceType)
      if (s) {
        suggested = {
          target_margin_bps: s.target_margin_bps,
          matched_item_count: s.matched_item_count,
          line_items: [
            { label: 'Labor', kind: 'labor', budgeted_cents: s.labor_budget_cents, actual_cents: 0, category_id: null },
            { label: 'Materials & Supplies', kind: 'materials', budgeted_cents: s.materials_budget_cents, actual_cents: 0, category_id: null },
            { label: 'Other', kind: 'other', budgeted_cents: s.other_budget_cents, actual_cents: 0, category_id: null },
          ],
        }
      }
    }

    return NextResponse.json({ quote, budget: budgetWithLines, suggested })
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

    const { data: budget, error } = await supabaseAdmin
      .from('quote_budgets')
      .upsert(
        {
          tenant_id: tenantId,
          quote_id: quoteId,
          target_margin_bps: targetMarginBps,
          notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null,
        },
        { onConflict: 'quote_id' }
      )
      .select('*')
      .single()
    if (error) throw error

    const inputLines = Array.isArray(body.line_items) ? (body.line_items as LineItemInput[]) : []
    // Replace-all: simplest correct semantics for a full-form save. The
    // budget itself is the unit users edit as a whole, not per-line.
    await supabaseAdmin.from('budget_line_items').delete().eq('quote_budget_id', budget.id)
    if (inputLines.length) {
      const rows = inputLines.map((li, idx) => ({
        tenant_id: tenantId,
        quote_budget_id: budget.id,
        category_id: li.category_id || null,
        label: (li.label || 'Line item').slice(0, 200),
        kind: VALID_KINDS.includes(li.kind || '') ? li.kind : 'other',
        budgeted_cents: centsOrZero(li.budgeted_cents),
        actual_cents: centsOrZero(li.actual_cents),
        sort_order: idx,
      }))
      await supabaseAdmin.from('budget_line_items').insert(rows)
    }

    const { data: lineItems } = await supabaseAdmin
      .from('budget_line_items')
      .select('id, category_id, label, kind, budgeted_cents, actual_cents, sort_order')
      .eq('quote_budget_id', budget.id)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ budget: { ...budget, line_items: lineItems || [] } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/quote-budgets/[quoteId]', err)
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
  }
}
