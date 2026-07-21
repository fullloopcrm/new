/**
 * Shared budget math for the Master Budget feature. Trade-agnostic: every
 * input is a generic catalog/inventory field, so the same template logic
 * produces a sensible budget whether the tenant is landscaping, cleaning,
 * junk removal, or any other trade in the registry -- nothing here is
 * trade-specific.
 *
 * - computeSuggestedBudget: derives a TEMPLATE budget for a quote from its
 *   line items × each matched service_types row's per-unit defaults (labor
 *   hours × labor rate, overhead) plus materials cost. Materials cost
 *   prefers the item's real bill of materials (catalog_item_materials ×
 *   inventory_items.unit_cost_cents, i.e. actual vendor-priced cost) and
 *   falls back to the hand-set service_types.cost_cents guess when no BOM
 *   is defined yet -- so a tenant gets a working template immediately and
 *   it gets more accurate as they fill in inventory/vendor data, with no
 *   breaking change for tenants who never set up a BOM.
 * - seedQuoteBudgetFromTemplate: persists that suggestion as the quote's real
 *   quote_budgets row at proposal create/edit time (POST /api/quotes, PATCH
 *   /api/quotes/[id]) -- so the budget exists from proposal time and carries
 *   through booking/job conversion via quote_id, instead of only ever being
 *   computed on-the-fly for the standalone Master Budget page.
 * - computeBudgetVariance: the budgeted/actual/variance/margin math, shared
 *   by the Sales Master Budget page and GET /api/jobs/[id]/budget-variance
 *   so both surfaces agree on the same numbers from one place.
 *
 * Line items don't carry a service_type_id FK (see normalizeLineItems in
 * src/lib/quote.ts) -- matching is by exact, case-insensitive name, the same
 * lookup _QuoteBuilder.tsx already uses to resolve a typed item name back to
 * its catalog row. The BOM lookup then keys off the matched service_types.id.
 */
import { supabaseAdmin } from './supabase'

export type QuoteLineItemLike = {
  name?: string | null
  quantity?: number | null
}

export type ServiceTypeTemplate = {
  id?: string
  name: string
  cost_cents?: number | null
  default_duration_hours?: number | null
  default_labor_rate_cents?: number | null
  default_overhead_cents?: number | null
  default_target_margin_bps?: number | null
}

export type MaterialsByServiceType = Map<string, { qty_per_unit: number; unit_cost_cents: number }[]>

export type SuggestedBudget = {
  labor_budget_cents: number
  materials_budget_cents: number
  other_budget_cents: number
  target_margin_bps: number | null
  matched_item_count: number
}

/**
 * Fetch each matched service type's bill of materials (real inventory cost),
 * keyed by service_type_id. Only queries the ids actually in play.
 */
export async function fetchMaterialsByServiceType(tenantId: string, serviceTypeIds: string[]): Promise<MaterialsByServiceType> {
  const map: MaterialsByServiceType = new Map()
  if (!serviceTypeIds.length) return map

  const { data } = await supabaseAdmin
    .from('catalog_item_materials')
    .select('service_type_id, qty_per_unit, inventory_items(unit_cost_cents)')
    .eq('tenant_id', tenantId)
    .in('service_type_id', serviceTypeIds)

  for (const row of (data || []) as unknown as { service_type_id: string; qty_per_unit: number; inventory_items: { unit_cost_cents: number } | null }[]) {
    const unitCostCents = row.inventory_items?.unit_cost_cents ?? 0
    const list = map.get(row.service_type_id) || []
    list.push({ qty_per_unit: row.qty_per_unit, unit_cost_cents: unitCostCents })
    map.set(row.service_type_id, list)
  }
  return map
}

/** Derive a suggested budget from a quote's line items matched against the tenant's catalog. */
export function computeSuggestedBudget(
  lineItems: QuoteLineItemLike[],
  serviceTypes: ServiceTypeTemplate[],
  materialsByServiceType?: MaterialsByServiceType,
): SuggestedBudget | null {
  if (!lineItems?.length || !serviceTypes?.length) return null

  const byName = new Map(serviceTypes.map((s) => [s.name.trim().toLowerCase(), s]))

  let laborCents = 0
  let materialsCents = 0
  let overheadCents = 0
  let matchedCount = 0
  const marginVotes: number[] = []

  for (const li of lineItems) {
    const key = (li.name || '').trim().toLowerCase()
    if (!key) continue
    const svc = byName.get(key)
    if (!svc) continue
    const qty = Number(li.quantity) > 0 ? Number(li.quantity) : 1
    matchedCount += 1

    if (svc.default_duration_hours != null && svc.default_labor_rate_cents != null) {
      laborCents += Math.round(svc.default_duration_hours * svc.default_labor_rate_cents * qty)
    }

    const bom = svc.id ? materialsByServiceType?.get(svc.id) : undefined
    if (bom && bom.length) {
      const bomUnitCents = bom.reduce((sum, m) => sum + m.qty_per_unit * m.unit_cost_cents, 0)
      materialsCents += Math.round(bomUnitCents * qty)
    } else if (svc.cost_cents != null) {
      materialsCents += Math.round(svc.cost_cents * qty)
    }
    if (svc.default_overhead_cents != null) {
      overheadCents += Math.round(svc.default_overhead_cents * qty)
    }
    if (svc.default_target_margin_bps != null) marginVotes.push(svc.default_target_margin_bps)
  }

  if (matchedCount === 0) return null

  // Target margin isn't additive across line items -- take the average of
  // whichever matched items have one set, so a quote built from several
  // catalog items still gets a sensible single target instead of picking
  // one item's number arbitrarily.
  const targetMarginBps = marginVotes.length
    ? Math.round(marginVotes.reduce((a, b) => a + b, 0) / marginVotes.length)
    : null

  return {
    labor_budget_cents: laborCents,
    materials_budget_cents: materialsCents,
    other_budget_cents: overheadCents,
    target_margin_bps: targetMarginBps,
    matched_item_count: matchedCount,
  }
}

export type MatchedLineItem = {
  service_type_id: string
  labor_cents: number
  overhead_cents: number
  has_bom: boolean
}

/**
 * Per-matched-item breakdown of the SUGGESTED (not user-edited) labor and
 * overhead contribution, keyed by service_type_id. Used by "Save as
 * Template" to figure out each matched catalog item's share of the
 * aggregate quote_budgets total, so a user-edited aggregate can be scaled
 * back down to a per-unit rate for each item individually.
 *
 * Materials are deliberately excluded here -- an item with a real BOM should
 * never have its per-unit material cost overwritten by a template guess;
 * only labor rate and overhead are template-worthy, since materials cost
 * should always come from actual inventory/vendor pricing when a BOM exists.
 */
export function matchLineItemsToServiceTypes(
  lineItems: QuoteLineItemLike[],
  serviceTypes: ServiceTypeTemplate[],
  materialsByServiceType?: MaterialsByServiceType,
): MatchedLineItem[] {
  const byName = new Map(serviceTypes.map((s) => [s.name.trim().toLowerCase(), s]))
  const out: MatchedLineItem[] = []

  for (const li of lineItems) {
    const key = (li.name || '').trim().toLowerCase()
    if (!key) continue
    const svc = byName.get(key)
    if (!svc || !svc.id) continue
    const qty = Number(li.quantity) > 0 ? Number(li.quantity) : 1

    const laborCents =
      svc.default_duration_hours != null && svc.default_labor_rate_cents != null
        ? Math.round(svc.default_duration_hours * svc.default_labor_rate_cents * qty)
        : 0
    const overheadCents = svc.default_overhead_cents != null ? Math.round(svc.default_overhead_cents * qty) : 0
    const bom = materialsByServiceType?.get(svc.id)

    out.push({ service_type_id: svc.id, labor_cents: laborCents, overhead_cents: overheadCents, has_bom: !!(bom && bom.length) })
  }
  return out
}

/**
 * Seed quote_budgets from the tenant's service_types templates the moment a
 * quote's line items exist -- proposal create (POST /api/quotes) and every
 * edit that touches line_items (PATCH /api/quotes/[id]). ignoreDuplicates on
 * quote_id (unique) makes this a no-op once a budget row exists, so it never
 * clobbers actuals or a manual override entered on the Master Budget page --
 * it only fills the "no budget yet" gap. Best-effort: a failure here must
 * never fail the quote write it's attached to.
 */
export async function seedQuoteBudgetFromTemplate(
  tenantId: string,
  quoteId: string,
  lineItems: QuoteLineItemLike[],
): Promise<void> {
  if (!lineItems?.length) return
  try {
    // Never clobber -- an existing budget (default or user-edited) is left alone.
    const { data: existing } = await supabaseAdmin.from('quote_budgets').select('id').eq('tenant_id', tenantId).eq('quote_id', quoteId).maybeSingle()
    if (existing) return

    const { data: serviceTypes } = await supabaseAdmin
      .from('service_types')
      .select('id, name, cost_cents, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps')
      .eq('tenant_id', tenantId)
    const materialsByServiceType = await fetchMaterialsByServiceType(tenantId, (serviceTypes || []).map((s) => s.id))
    const suggested = computeSuggestedBudget(lineItems, serviceTypes || [], materialsByServiceType)
    if (!suggested) return

    const { data: budget, error } = await supabaseAdmin
      .from('quote_budgets')
      .insert({ tenant_id: tenantId, quote_id: quoteId, target_margin_bps: suggested.target_margin_bps })
      .select('id')
      .single()
    if (error || !budget) return

    await supabaseAdmin.from('budget_line_items').insert([
      { tenant_id: tenantId, quote_budget_id: budget.id, label: 'Labor', kind: 'labor', budgeted_cents: suggested.labor_budget_cents, actual_cents: 0, sort_order: 0 },
      { tenant_id: tenantId, quote_budget_id: budget.id, label: 'Materials & Supplies', kind: 'materials', budgeted_cents: suggested.materials_budget_cents, actual_cents: 0, sort_order: 1 },
      { tenant_id: tenantId, quote_budget_id: budget.id, label: 'Other', kind: 'other', budgeted_cents: suggested.other_budget_cents, actual_cents: 0, sort_order: 2 },
    ])
  } catch (err) {
    console.error('seedQuoteBudgetFromTemplate', err)
  }
}

export type BudgetLineItemLike = {
  budgeted_cents: number
  actual_cents: number
}

export type BudgetVariance = {
  budgeted_total_cents: number
  actual_total_cents: number
  variance_cents: number
  projected_margin_bps: number | null
}

/** Same budgeted/actual/variance/margin math BudgetTab.tsx renders, centralized. */
export function computeBudgetVariance(lineItems: BudgetLineItemLike[], contractTotalCents: number): BudgetVariance {
  const budgetedTotalCents = lineItems.reduce((sum, li) => sum + li.budgeted_cents, 0)
  const actualTotalCents = lineItems.reduce((sum, li) => sum + li.actual_cents, 0)
  const varianceCents = budgetedTotalCents - actualTotalCents
  const projectedMarginBps =
    contractTotalCents > 0 ? Math.round(((contractTotalCents - actualTotalCents) / contractTotalCents) * 10000) : null

  return {
    budgeted_total_cents: budgetedTotalCents,
    actual_total_cents: actualTotalCents,
    variance_cents: varianceCents,
    projected_margin_bps: projectedMarginBps,
  }
}
