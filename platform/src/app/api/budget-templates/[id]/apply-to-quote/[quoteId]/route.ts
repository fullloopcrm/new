/**
 * Apply a saved budget template to a specific quote -- copies the
 * template's line items into that quote's quote_budgets (creating the
 * budget row if it doesn't exist yet). A COPY, not a link: later edits to
 * the template or the quote's budget never silently rewrite each other.
 * Overwrites any existing line items on that quote's budget (this is an
 * explicit "start from this template" action, not a merge).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string; quoteId: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('sales.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id, quoteId } = await params

    const { data: template } = await tenantDb(tenantId).from('budget_templates').select('id, target_margin_bps').eq('id', id).single()
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const { data: templateLines } = await tenantDb(tenantId)
      .from('budget_template_line_items')
      .select('service_type_id, category_id, label, kind, qty, budgeted_cents')
      .eq('budget_template_id', id)
      .order('sort_order', { ascending: true })

    const { data: quote } = await tenantDb(tenantId).from('quotes').select('id').eq('id', quoteId).single()
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

    const { data: budget, error } = await tenantDb(tenantId)
      .from('quote_budgets')
      .upsert({ tenant_id: tenantId, quote_id: quoteId, target_margin_bps: template.target_margin_bps }, { onConflict: 'quote_id' })
      .select('id')
      .single()
    if (error || !budget) throw error

    await tenantDb(tenantId).from('budget_line_items').delete().eq('quote_budget_id', budget.id)
    const rows = (templateLines || []).map((li, idx) => ({
      tenant_id: tenantId,
      quote_budget_id: budget.id,
      service_type_id: li.service_type_id,
      category_id: li.category_id,
      label: li.label,
      kind: li.kind,
      qty: li.qty,
      budgeted_cents: li.budgeted_cents,
      actual_cents: 0,
      sort_order: idx,
    }))
    if (rows.length) await tenantDb(tenantId).from('budget_line_items').insert(rows)

    return NextResponse.json({ ok: true, line_item_count: rows.length })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/budget-templates/[id]/apply-to-quote/[quoteId]', err)
    return NextResponse.json({ error: 'Failed to apply template' }, { status: 500 })
  }
}
