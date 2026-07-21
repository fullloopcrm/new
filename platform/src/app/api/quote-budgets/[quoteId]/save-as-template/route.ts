/**
 * "Save as Template" — push the CURRENT (possibly user-edited) aggregate
 * labor/overhead/target-margin budget for a quote back onto the defaults of
 * each catalog item (service_types row) matched by its line items, so every
 * future quote using those same catalog items starts from these numbers.
 * Trade-agnostic: service_types is the same generic table every tenant type
 * uses, so this applies universally, not just to one trade.
 *
 * Deliberately does NOT touch materials/cost_cents: an item with a real
 * bill of materials should always cost from actual inventory/vendor pricing,
 * never from a template guess overwriting it.
 *
 * Scaling: each matched item's ORIGINAL suggested labor/overhead
 * contribution (qty-applied) is computed, then the edited aggregate is
 * distributed proportionally to each item's share of that original total --
 * so editing the aggregate up or down scales every matched item's per-unit
 * rate by the same factor rather than arbitrarily favoring one line.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { fetchMaterialsByServiceType, matchLineItemsToServiceTypes } from '@/lib/budget-template'

type Params = { params: Promise<{ quoteId: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { quoteId } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))

    // Client sends the current (possibly user-edited) line items; sum by
    // kind here rather than trusting pre-aggregated totals from the caller.
    const lineItems = Array.isArray(body.line_items) ? (body.line_items as { kind?: string; budgeted_cents?: number }[]) : []
    const laborBudgetCents = Math.max(0, Math.round(lineItems.filter((li) => li.kind === 'labor').reduce((s, li) => s + (Number(li.budgeted_cents) || 0), 0)))
    const overheadBudgetCents = Math.max(0, Math.round(lineItems.filter((li) => li.kind === 'other').reduce((s, li) => s + (Number(li.budgeted_cents) || 0), 0)))
    const targetMarginBps = body.target_margin_bps != null ? Math.round(Number(body.target_margin_bps)) : null

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id, line_items')
      .eq('tenant_id', tenantId)
      .eq('id', quoteId)
      .single()
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

    const { data: serviceTypes } = await supabaseAdmin
      .from('service_types')
      .select('id, name, cost_cents, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps')
      .eq('tenant_id', tenantId)
    const materialsByServiceType = await fetchMaterialsByServiceType(tenantId, (serviceTypes || []).map((s) => s.id))
    const matched = matchLineItemsToServiceTypes(
      (quote.line_items as { name?: string; quantity?: number }[]) || [],
      serviceTypes || [],
      materialsByServiceType,
    )
    if (!matched.length) return NextResponse.json({ error: 'No catalog items matched this quote — nothing to save as a template' }, { status: 400 })

    const originalLaborTotal = matched.reduce((sum, m) => sum + m.labor_cents, 0)
    const originalOverheadTotal = matched.reduce((sum, m) => sum + m.overhead_cents, 0)
    const laborScale = originalLaborTotal > 0 ? laborBudgetCents / originalLaborTotal : null
    const overheadScale = originalOverheadTotal > 0 ? overheadBudgetCents / originalOverheadTotal : null

    const byId = new Map((serviceTypes || []).map((s) => [s.id, s]))
    const updated: string[] = []

    for (const m of matched) {
      const svc = byId.get(m.service_type_id)
      if (!svc) continue
      const patch: Record<string, unknown> = {}

      if (laborScale != null && svc.default_labor_rate_cents != null) {
        patch.default_labor_rate_cents = Math.max(0, Math.round(svc.default_labor_rate_cents * laborScale))
      }
      if (overheadScale != null && svc.default_overhead_cents != null) {
        patch.default_overhead_cents = Math.max(0, Math.round(svc.default_overhead_cents * overheadScale))
      }
      if (targetMarginBps != null) patch.default_target_margin_bps = targetMarginBps

      if (Object.keys(patch).length === 0) continue
      const { error } = await tenantDb(tenantId).from('service_types').update(patch).eq('id', m.service_type_id)
      if (!error) updated.push(m.service_type_id)
    }

    return NextResponse.json({ ok: true, updated_service_type_ids: updated, skipped_materials: matched.filter((m) => m.has_bom).length })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quote-budgets/[quoteId]/save-as-template', err)
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 })
  }
}
