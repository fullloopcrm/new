# W4 — Master Budget: per-service-type template defaults + job budget-variance read endpoint

**Migration (NOT run):** `platform/src/lib/migrations/2026_07_18_service_types_budget_defaults.sql`

## 1. Template-per-service-type budget defaults

Checked `cost_cents` on `service_types` first, per leader instruction, before
adding columns:

- `cost_cents` already exists (per-SKU internal cost, used for Master Catalog
  margin display). Reused directly as the per-unit **materials** estimate —
  no new column.
- `default_duration_hours` already exists (booking duration estimate).
  Reused as the per-unit **labor hours** estimate.
- `default_hourly_rate` was **not** reused for a labor cost rate — that
  column is the customer-facing price rate for legacy hourly-priced
  services (`/api/portal/bookings`, `tenant-site.ts`). Reusing it would
  conflate revenue and cost.

New, genuinely missing pieces added as nullable columns on `service_types`:
`default_labor_rate_cents` (internal labor cost/hr), `default_overhead_cents`
(flat per-unit overhead estimate), `default_target_margin_bps`.

Net: 3 new columns instead of 5+, by reusing what already existed.

**Wiring:**
- `src/lib/budget-template.ts` — `computeSuggestedBudget()` matches a
  quote's line items to `service_types` rows **by name** (line items don't
  carry a `service_type_id` FK today — same name-match precedent
  `_QuoteBuilder.tsx` already uses for its SKU datalist), multiplies each
  matched item's template × quantity, sums across the quote, and averages
  `default_target_margin_bps` across matched items.
- `GET /api/quote-budgets/[quoteId]` — when no budget row exists yet, now
  also returns `suggested: {...} | null` computed from the above.
- `BudgetTab.tsx` — opening a quote with no saved budget now fetches the
  suggestion and pre-fills the form instead of showing blanks.
- `/api/catalog` (GET/POST/PATCH) — exposes the 3 new fields so they're
  actually settable (same pattern as the existing `cost_cents` field).
  **Not done:** CatalogTab.tsx UI to edit these fields — flagged below, out
  of scope for this order.

## 2. Job budget-variance read endpoint (for W2)

`GET /api/jobs/[id]/budget-variance` — new file, read-only, gated on
`sales.view` (matches `/api/quote-budgets`, since this surfaces internal
cost/margin data). Resolves `jobs.quote_id` → `quote_budgets` → variance,
using the same `computeBudgetVariance()` in `budget-template.ts` that
`BudgetTab.tsx` uses, so both surfaces agree on one set of numbers.

Response contract (documented in the route file's header comment):
```
{
  job_id, quote_id: string | null,
  contract_total_cents: number,
  budget: {...} | null,
  suggested: {...} | null,   // only populated when budget is null
  variance: {
    budgeted_total_cents, actual_total_cents, variance_cents,
    projected_margin_bps: number | null,
  } | null,
}
```
`quote_id: null` (job has no source quote) returns `budget`/`suggested`/
`variance` all `null` with a 200, not an error.

**Did not touch** W2's job detail page file, per instruction — this is the
API contract for W2 to wire in.

## Verification

- `npx tsc --noEmit` — clean, exit 0.
- `npx eslint` on all changed/new files — 0 errors.
- Not run in a browser — migration not applied, no live `quote_budgets`/new
  `service_types` columns in any DB yet.

## Flag for leader

- CatalogTab.tsx has no UI yet to set `default_labor_rate_cents` /
  `default_overhead_cents` / `default_target_margin_bps` on a catalog item —
  the API accepts them, but a tenant can't set them without a UI. Small
  follow-up (3 more inputs on the existing catalog item editor form),
  didn't build it since it wasn't part of this order and CatalogTab.tsx UI
  work overlaps W1's Master Catalog lane.
