/**
 * Budget vs. actuals for a single job, via its source quote's Master Budget
 * (see quote_budgets / /api/quote-budgets). Read-only. Built for the job
 * detail page (W2's lane) to wire in without duplicating this schema or the
 * variance math -- this route + src/lib/budget-template.ts are the shared
 * contract; the job detail page should call this endpoint rather than
 * querying quote_budgets/service_types itself.
 *
 * Gated on `sales.view` (matches /api/quote-budgets) since this surfaces
 * internal cost/margin data, not just scheduling info -- a caller without
 * sales visibility gets a 403 and should hide the budget section rather
 * than treating it as "no budget set."
 *
 * GET /api/jobs/[id]/budget-variance →
 *   {
 *     job_id: string,
 *     quote_id: string | null,          // null if this job has no source quote
 *     contract_total_cents: number,     // job.total_cents
 *     budget: {                         // null if quote has no saved budget yet
 *       target_margin_bps: number | null,
 *       notes: string | null,
 *       line_items: [{ id, category_id, label, kind, budgeted_cents, actual_cents, sort_order }],
 *     } | null,
 *     suggested: {                      // template-derived starting point, only
 *       target_margin_bps: number | null,          // present when `budget` is null
 *       matched_item_count: number,
 *       line_items: [{ label, kind, budgeted_cents, actual_cents, category_id }],
 *     } | null,
 *     variance: {                       // null when there's no budget to compare
 *       budgeted_total_cents, actual_total_cents, variance_cents,
 *       projected_margin_bps: number | null,   // vs. contract_total_cents
 *     } | null,
 *   }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { computeSuggestedBudget, computeBudgetVariance, fetchMaterialsByServiceType } from '@/lib/budget-template'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const { data: job, error: jobErr } = await supabaseAdmin
      .from('jobs')
      .select('id, quote_id, total_cents')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!job.quote_id) {
      return NextResponse.json({
        job_id: job.id,
        quote_id: null,
        contract_total_cents: job.total_cents,
        budget: null,
        suggested: null,
        variance: null,
      })
    }

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id, line_items')
      .eq('tenant_id', tenantId)
      .eq('id', job.quote_id)
      .maybeSingle()

    const { data: budget } = await supabaseAdmin
      .from('quote_budgets')
      .select('id, target_margin_bps, notes')
      .eq('tenant_id', tenantId)
      .eq('quote_id', job.quote_id)
      .maybeSingle()

    let lineItems: { budgeted_cents: number; actual_cents: number }[] = []
    if (budget) {
      const { data } = await supabaseAdmin
        .from('budget_line_items')
        .select('id, category_id, label, kind, budgeted_cents, actual_cents, sort_order')
        .eq('quote_budget_id', budget.id)
        .order('sort_order', { ascending: true })
      lineItems = data || []
    }

    let suggested = null
    if (!budget && quote) {
      const { data: serviceTypes } = await supabaseAdmin
        .from('service_types')
        .select('id, name, cost_cents, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps')
        .eq('tenant_id', tenantId)
      const materialsByServiceType = await fetchMaterialsByServiceType(tenantId, (serviceTypes || []).map((s) => s.id))
      suggested = computeSuggestedBudget((quote.line_items as { name?: string; quantity?: number }[]) || [], serviceTypes || [], materialsByServiceType)
    }

    const variance = budget ? computeBudgetVariance(lineItems, job.total_cents) : null

    return NextResponse.json({
      job_id: job.id,
      quote_id: job.quote_id,
      contract_total_cents: job.total_cents,
      budget: budget ? { ...budget, line_items: lineItems } : null,
      suggested,
      variance,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/jobs/[id]/budget-variance', err)
    return NextResponse.json({ error: 'Failed to load budget variance' }, { status: 500 })
  }
}
