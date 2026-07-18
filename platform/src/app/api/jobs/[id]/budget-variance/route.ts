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
 *       labor_budget_cents, materials_budget_cents, other_budget_cents,
 *       target_margin_bps: number | null,
 *       labor_actual_cents, materials_actual_cents, other_actual_cents,
 *       notes: string | null,
 *     } | null,
 *     suggested: {                      // template-derived starting point, only
 *       labor_budget_cents, materials_budget_cents, other_budget_cents,   // present when `budget` is null
 *       target_margin_bps: number | null,
 *       matched_item_count: number,
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
import { computeSuggestedBudget, computeBudgetVariance } from '@/lib/budget-template'

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
      .select('labor_budget_cents, materials_budget_cents, other_budget_cents, target_margin_bps, labor_actual_cents, materials_actual_cents, other_actual_cents, notes')
      .eq('tenant_id', tenantId)
      .eq('quote_id', job.quote_id)
      .maybeSingle()

    let suggested = null
    if (!budget && quote) {
      const { data: serviceTypes } = await supabaseAdmin
        .from('service_types')
        .select('name, cost_cents, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps')
        .eq('tenant_id', tenantId)
      suggested = computeSuggestedBudget((quote.line_items as { name?: string; quantity?: number }[]) || [], serviceTypes || [])
    }

    const variance = budget ? computeBudgetVariance(budget, job.total_cents) : null

    return NextResponse.json({
      job_id: job.id,
      quote_id: job.quote_id,
      contract_total_cents: job.total_cents,
      budget: budget || null,
      suggested,
      variance,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/jobs/[id]/budget-variance', err)
    return NextResponse.json({ error: 'Failed to load budget variance' }, { status: 500 })
  }
}
