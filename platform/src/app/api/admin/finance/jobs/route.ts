/**
 * Platform Finance — Jobs tab. Cross-tenant job-costing rollup: budgeted vs.
 * actual cost per job, platform-wide. `budget_line_items.actual_cents` is
 * already real (auto-recomputed from job-scoped `expenses` rows — see
 * src/app/api/jobs/[id]/expenses/route.ts) rather than hand-typed, so this
 * is genuine job costing, not a guess. Uses the same `computeBudgetVariance`
 * math as the per-job budget-variance endpoint and the Sales Budgets tab, so
 * all three surfaces agree.
 *
 * Known gap (flagged, not fixed here): these job expenses feed
 * budget_line_items.actual_cents but do not currently post to the ledger,
 * so this tab's actuals and the Revenue/Margin tabs' ledger COGS can
 * legitimately disagree until that seam is wired.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { computeBudgetVariance } from '@/lib/budget-template'
import { isTestTenant } from '@/lib/finance/platform-reports'

const PAGE = 1000

interface LineItemRow {
  quote_budget_id: string
  budgeted_cents: number
  actual_cents: number
}

async function fetchAllLineItems(): Promise<LineItemRow[]> {
  const out: LineItemRow[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('budget_line_items') // tenant-scope-ok: /admin/finance is requireAdmin-gated; platform-wide job-costing rollup, intentionally cross-tenant.
      .select('quote_budget_id, budgeted_cents, actual_cents')
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    out.push(...((data || []) as LineItemRow[]))
    if (!data || data.length < PAGE) break
    offset += PAGE
  }
  return out
}

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const lineItems = await fetchAllLineItems()
    const linesByBudget = new Map<string, { budgeted_cents: number; actual_cents: number }[]>()
    for (const li of lineItems) {
      const arr = linesByBudget.get(li.quote_budget_id) || []
      arr.push({ budgeted_cents: li.budgeted_cents, actual_cents: li.actual_cents })
      linesByBudget.set(li.quote_budget_id, arr)
    }

    const { data: budgets, error: budgetsErr } = await supabaseAdmin
      .from('quote_budgets')
      .select('id, tenant_id, quote_id, target_margin_bps')
    if (budgetsErr) throw budgetsErr
    const budgetsWithLines = (budgets || []).filter((b) => linesByBudget.has(b.id))
    const quoteIds = budgetsWithLines.map((b) => b.quote_id)

    if (quoteIds.length === 0) {
      return NextResponse.json({
        jobCount: 0,
        totalContract: 0,
        totalBudgeted: 0,
        totalActual: 0,
        totalVariance: 0,
        byTenant: [],
        worstVariance: [],
        source: 'budget_line_items',
      })
    }

    const { data: jobs, error: jobsErr } = await supabaseAdmin
      .from('jobs')
      .select('id, tenant_id, title, status, total_cents, quote_id')
      .in('quote_id', quoteIds)
      .neq('status', 'cancelled')
    if (jobsErr) throw jobsErr

    const budgetByQuoteId = new Map(budgetsWithLines.map((b) => [b.quote_id, b]))
    const tenantIds = Array.from(new Set((jobs || []).map((j) => j.tenant_id)))
    const { data: tenants } = await supabaseAdmin.from('tenants').select('id, name').in('id', tenantIds)
    const tenantNames: Record<string, string> = {}
    for (const t of tenants || []) tenantNames[t.id] = t.name

    interface JobVariance {
      job_id: string
      tenant_id: string
      tenant_name: string
      title: string | null
      contract_cents: number
      budgeted_cents: number
      actual_cents: number
      variance_cents: number
      projected_margin_bps: number | null
    }

    const jobVariances: JobVariance[] = []
    for (const job of jobs || []) {
      if (!job.quote_id) continue
      if (isTestTenant(tenantNames[job.tenant_id] || '')) continue
      const budget = budgetByQuoteId.get(job.quote_id)
      if (!budget) continue
      const lines = linesByBudget.get(budget.id) || []
      const variance = computeBudgetVariance(lines, job.total_cents)
      jobVariances.push({
        job_id: job.id,
        tenant_id: job.tenant_id,
        tenant_name: tenantNames[job.tenant_id] || job.tenant_id.slice(0, 8),
        title: job.title,
        contract_cents: job.total_cents,
        budgeted_cents: variance.budgeted_total_cents,
        actual_cents: variance.actual_total_cents,
        variance_cents: variance.variance_cents,
        projected_margin_bps: variance.projected_margin_bps,
      })
    }

    const byTenantMap = new Map<
      string,
      { tenant_name: string; jobCount: number; contract: number; budgeted: number; actual: number }
    >()
    for (const jv of jobVariances) {
      const cur = byTenantMap.get(jv.tenant_id) || {
        tenant_name: jv.tenant_name,
        jobCount: 0,
        contract: 0,
        budgeted: 0,
        actual: 0,
      }
      cur.jobCount += 1
      cur.contract += jv.contract_cents
      cur.budgeted += jv.budgeted_cents
      cur.actual += jv.actual_cents
      byTenantMap.set(jv.tenant_id, cur)
    }

    const byTenant = Array.from(byTenantMap.entries())
      .map(([tenant_id, v]) => ({
        tenant_id,
        tenant_name: v.tenant_name,
        jobCount: v.jobCount,
        contract: v.contract / 100,
        budgeted: v.budgeted / 100,
        actual: v.actual / 100,
        variance: (v.budgeted - v.actual) / 100,
      }))
      .sort((a, b) => b.contract - a.contract)

    const worstVariance = [...jobVariances]
      .sort((a, b) => a.variance_cents - b.variance_cents)
      .slice(0, 10)
      .map((jv) => ({
        job_id: jv.job_id,
        tenant_name: jv.tenant_name,
        title: jv.title || 'Untitled job',
        contract: jv.contract_cents / 100,
        budgeted: jv.budgeted_cents / 100,
        actual: jv.actual_cents / 100,
        variance: jv.variance_cents / 100,
        projectedMarginBps: jv.projected_margin_bps,
      }))

    const totals = jobVariances.reduce(
      (acc, jv) => ({
        contract: acc.contract + jv.contract_cents,
        budgeted: acc.budgeted + jv.budgeted_cents,
        actual: acc.actual + jv.actual_cents,
      }),
      { contract: 0, budgeted: 0, actual: 0 },
    )

    return NextResponse.json({
      jobCount: jobVariances.length,
      totalContract: totals.contract / 100,
      totalBudgeted: totals.budgeted / 100,
      totalActual: totals.actual / 100,
      totalVariance: (totals.budgeted - totals.actual) / 100,
      byTenant,
      worstVariance,
      source: 'budget_line_items',
    })
  } catch (err) {
    console.error('GET /api/admin/finance/jobs', err)
    return NextResponse.json({ error: 'Failed to load job costing data' }, { status: 500 })
  }
}
