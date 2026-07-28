/**
 * Shared budget_line_items persistence — used by both /api/quote-budgets/[quoteId]
 * and /api/quote-budgets/recurring/[scheduleId], since a budget's line items work
 * identically regardless of whether its parent (quote_budgets row) is attached to
 * a quote or a recurring_schedules row (see 2026_07_27_recurring_schedule_budgets.sql).
 */
import { supabaseAdmin } from '@/lib/supabase'

export type LineItemInput = {
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

const LINE_ITEM_SELECT = 'id, service_type_id, category_id, label, description, kind, labor_cents, supplies_cents, budgeted_cents, actual_cents, margin_bps, sort_order'
const VALID_KINDS = ['labor', 'materials', 'equipment', 'other']

function centsOrZero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

export async function fetchBudgetLineItems(quoteBudgetId: string) {
  const { data } = await supabaseAdmin
    .from('budget_line_items')
    .select(LINE_ITEM_SELECT)
    .eq('quote_budget_id', quoteBudgetId)
    .order('sort_order', { ascending: true })
  return data || []
}

/** Replace-all: the budget is edited as a whole, not per-line (see route comments). */
export async function replaceBudgetLineItems(tenantId: string, quoteBudgetId: string, inputLines: LineItemInput[]) {
  await supabaseAdmin.from('budget_line_items').delete().eq('tenant_id', tenantId).eq('quote_budget_id', quoteBudgetId)
  if (inputLines.length) {
    const rows = inputLines.map((li, idx) => ({
      tenant_id: tenantId,
      quote_budget_id: quoteBudgetId,
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
    await supabaseAdmin.from('budget_line_items').insert(rows) // tenant-scope-ok: every row is stamped with tenant_id above; audit heuristic doesn't parse insert() payloads
  }
  return fetchBudgetLineItems(quoteBudgetId)
}

export function targetMarginBpsFromBody(body: Record<string, unknown>): number | null {
  return body.target_margin_bps === null || body.target_margin_bps === undefined || body.target_margin_bps === ''
    ? null
    : Math.max(0, Math.min(10000, Math.round(Number(body.target_margin_bps) || 0)))
}

type BudgetTemplateLine = {
  service_type_id: string | null
  category_id: string | null
  label: string
  description: string | null
  kind: string
  labor_cents: number
  supplies_cents: number
  budgeted_cents: number
  margin_bps: number | null
}

/**
 * Copy a saved budget template's line items onto a budget attached to either
 * a quote or a recurring_schedules row. A COPY, not a link — later edits to
 * the template or the budget never silently rewrite each other. Shared by
 * apply-to-quote/[quoteId] and apply-to-recurring/[scheduleId].
 */
export async function applyTemplateToBudget(
  tenantId: string,
  templateLines: BudgetTemplateLine[],
  parent: { quote_id: string; recurring_schedule_id?: never } | { recurring_schedule_id: string; quote_id?: never },
  targetMarginBps: number | null,
): Promise<{ budgetId: string; lineItemCount: number }> {
  const onConflict = 'quote_id' in parent && parent.quote_id ? 'quote_id' : 'recurring_schedule_id'
  const { data: budget, error } = await supabaseAdmin
    .from('quote_budgets')
    .upsert({ tenant_id: tenantId, ...parent, target_margin_bps: targetMarginBps }, { onConflict })
    .select('id')
    .single()
  if (error || !budget) throw error

  const rows = templateLines.map((li, idx) => ({
    tenant_id: tenantId,
    quote_budget_id: budget.id,
    service_type_id: li.service_type_id,
    category_id: li.category_id,
    label: li.label,
    description: li.description,
    kind: li.kind,
    labor_cents: li.labor_cents,
    supplies_cents: li.supplies_cents,
    budgeted_cents: li.budgeted_cents,
    actual_cents: 0,
    margin_bps: li.margin_bps,
    sort_order: idx,
  }))
  await supabaseAdmin.from('budget_line_items').delete().eq('tenant_id', tenantId).eq('quote_budget_id', budget.id)
  if (rows.length) await supabaseAdmin.from('budget_line_items').insert(rows) // tenant-scope-ok: every row is stamped with tenant_id above; audit heuristic doesn't parse insert() payloads

  return { budgetId: budget.id, lineItemCount: rows.length }
}
