/**
 * Shared budget math. computeBudgetVariance is the budgeted/actual/
 * variance/margin math, shared by the Sales Budgets page and
 * GET /api/jobs/[id]/budget-variance so both surfaces agree on the same
 * numbers from one place.
 *
 * A quote's budget is always populated by applying a saved Budget Template
 * (see /api/budget-templates/[id]/apply-to-quote/[quoteId]) -- there is no
 * catalog-derived auto-suggestion in this file anymore.
 */

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
