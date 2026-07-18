/**
 * Shared budget math for the Master Budget feature.
 *
 * - computeSuggestedBudget: derives a TEMPLATE budget for a quote from its
 *   line items × each matched service_types row's per-unit defaults (labor
 *   hours × labor rate, materials cost_cents, overhead). Used to pre-fill a
 *   blank quote_budgets form instead of starting at zero.
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
 * its catalog row.
 */
import { supabaseAdmin } from './supabase'

export type QuoteLineItemLike = {
  name?: string | null
  quantity?: number | null
}

export type ServiceTypeTemplate = {
  name: string
  cost_cents?: number | null
  default_duration_hours?: number | null
  default_labor_rate_cents?: number | null
  default_overhead_cents?: number | null
  default_target_margin_bps?: number | null
}

export type SuggestedBudget = {
  labor_budget_cents: number
  materials_budget_cents: number
  other_budget_cents: number
  target_margin_bps: number | null
  matched_item_count: number
}

/** Derive a suggested budget from a quote's line items matched against the tenant's catalog. */
export function computeSuggestedBudget(
  lineItems: QuoteLineItemLike[],
  serviceTypes: ServiceTypeTemplate[],
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
    if (svc.cost_cents != null) {
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
    const { data: serviceTypes } = await supabaseAdmin
      .from('service_types')
      .select('name, cost_cents, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps')
      .eq('tenant_id', tenantId)
    const suggested = computeSuggestedBudget(lineItems, serviceTypes || [])
    if (!suggested) return

    await supabaseAdmin.from('quote_budgets').upsert(
      {
        tenant_id: tenantId,
        quote_id: quoteId,
        labor_budget_cents: suggested.labor_budget_cents,
        materials_budget_cents: suggested.materials_budget_cents,
        other_budget_cents: suggested.other_budget_cents,
        target_margin_bps: suggested.target_margin_bps,
        labor_actual_cents: 0,
        materials_actual_cents: 0,
        other_actual_cents: 0,
      },
      { onConflict: 'quote_id', ignoreDuplicates: true },
    )
  } catch (err) {
    console.error('seedQuoteBudgetFromTemplate', err)
  }
}

export type BudgetTotalsLike = {
  labor_budget_cents: number
  materials_budget_cents: number
  other_budget_cents: number
  labor_actual_cents: number
  materials_actual_cents: number
  other_actual_cents: number
}

export type BudgetVariance = {
  budgeted_total_cents: number
  actual_total_cents: number
  variance_cents: number
  projected_margin_bps: number | null
}

/** Same budgeted/actual/variance/margin math BudgetTab.tsx renders, centralized. */
export function computeBudgetVariance(budget: BudgetTotalsLike, contractTotalCents: number): BudgetVariance {
  const budgetedTotalCents = budget.labor_budget_cents + budget.materials_budget_cents + budget.other_budget_cents
  const actualTotalCents = budget.labor_actual_cents + budget.materials_actual_cents + budget.other_actual_cents
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
