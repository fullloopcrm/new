/**
 * Budgets — get / upsert a single quote's budget. One budget row per quote
 * (quote_budgets.quote_id is unique); jobs.quote_id links a converted job
 * back to the same quote, so this budget carries forward once the quote
 * converts — no separate per-job row.
 *
 * A quote's budget is ALWAYS populated by applying a saved Budget Template
 * (see /api/budget-templates/[id]/apply-to-quote/[quoteId]) -- there is no
 * ad-hoc/blank creation and no auto-derived suggestion from catalog
 * defaults here; this route only gets/saves whatever line items already
 * exist on the budget.
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

type Params = { params: Promise<{ quoteId: string }> }

type LineItemInput = {
  service_type_id?: string | null
  category_id?: string | null
  label?: string
  description?: string | null
  kind?: string
  labor_cents?: number
  supplies_cents?: number
  budgeted_cents?: number
  actual_cents?: number
  margin_bps?: number | null
}

function centsOrZero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}
const VALID_KINDS = ['labor', 'materials', 'equipment', 'other']

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { quoteId } = await params

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id, quote_number, title, status, total_cents, client_id, clients(id, name)')
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
        .select('id, service_type_id, category_id, label, description, kind, labor_cents, supplies_cents, budgeted_cents, actual_cents, margin_bps, sort_order')
        .eq('quote_budget_id', budget.id)
        .order('sort_order', { ascending: true })
      budgetWithLines = { ...budget, line_items: lineItems || [] }
    }

    return NextResponse.json({ quote, budget: budgetWithLines })
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
        service_type_id: li.service_type_id || null,
        category_id: li.category_id || null,
        label: (li.label || 'Line item').slice(0, 200),
        description: (li.description || '').slice(0, 500) || null,
        kind: VALID_KINDS.includes(li.kind || '') ? li.kind : 'other',
        labor_cents: centsOrZero(li.labor_cents),
        supplies_cents: centsOrZero(li.supplies_cents),
        budgeted_cents: centsOrZero(li.budgeted_cents),
        actual_cents: centsOrZero(li.actual_cents),
        margin_bps: li.margin_bps != null && li.margin_bps !== ('' as unknown) ? Math.round(Number(li.margin_bps)) : null,
        sort_order: idx,
      }))
      await supabaseAdmin.from('budget_line_items').insert(rows)
    }

    const { data: lineItems } = await supabaseAdmin
      .from('budget_line_items')
      .select('id, service_type_id, category_id, label, description, kind, labor_cents, supplies_cents, budgeted_cents, actual_cents, margin_bps, sort_order')
      .eq('quote_budget_id', budget.id)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ budget: { ...budget, line_items: lineItems || [] } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/quote-budgets/[quoteId]', err)
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
  }
}
