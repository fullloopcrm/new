/**
 * Apply a saved budget template to a specific recurring_schedules row.
 * Mirrors apply-to-quote/[quoteId] exactly, for schedules with no
 * originating quote (see 2026_07_27_recurring_schedule_budgets.sql).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { applyTemplateToBudget } from '@/lib/finance/budget-line-items'

type Params = { params: Promise<{ id: string; scheduleId: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('sales.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id, scheduleId } = await params

    const { data: template } = await tenantDb(tenantId).from('budget_templates').select('id, target_margin_bps').eq('id', id).single()
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const { data: templateLines } = await tenantDb(tenantId)
      .from('budget_template_line_items')
      .select('service_type_id, category_id, label, description, kind, labor_cents, supplies_cents, budgeted_cents, margin_bps')
      .eq('budget_template_id', id)
      .order('sort_order', { ascending: true })

    const { data: schedule } = await tenantDb(tenantId).from('recurring_schedules').select('id').eq('id', scheduleId).single()
    if (!schedule) return NextResponse.json({ error: 'Recurring schedule not found' }, { status: 404 })

    const { lineItemCount } = await applyTemplateToBudget(tenantId, templateLines || [], { recurring_schedule_id: scheduleId }, template.target_margin_bps)

    return NextResponse.json({ ok: true, line_item_count: lineItemCount })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/budget-templates/[id]/apply-to-recurring/[scheduleId]', err)
    return NextResponse.json({ error: 'Failed to apply template' }, { status: 500 })
  }
}
