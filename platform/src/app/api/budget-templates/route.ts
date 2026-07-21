/**
 * Budget Templates — standalone, named, reusable budget packages. Not tied
 * to a quote or customer: a tenant builds "Basic Lawn Care Package" once
 * (its own line items, its own target margin) and applies it to specific
 * quotes later via POST /api/budget-templates/[id]/apply-to-quote/[quoteId].
 *
 * Distinct from quote_budgets (the per-quote actual/tracking record, which
 * has actuals -- a template never does, it's a costing pattern, not a job
 * in progress).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

const COLUMNS = 'id, name, description, target_margin_bps, active, created_at'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('sales.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { data: templates, error } = await tenantDb(tenantId)
      .from('budget_templates')
      .select(COLUMNS)
      .order('name', { ascending: true })
    if (error) throw error

    const templateIds = (templates || []).map((t) => t.id)
    const { data: lineItems } = templateIds.length
      ? await tenantDb(tenantId).from('budget_template_line_items').select('budget_template_id, budgeted_cents').in('budget_template_id', templateIds)
      : { data: [] }
    const totalByTemplate = new Map<string, number>()
    for (const li of lineItems || []) totalByTemplate.set(li.budget_template_id, (totalByTemplate.get(li.budget_template_id) || 0) + li.budgeted_cents)

    return NextResponse.json({ templates: (templates || []).map((t) => ({ ...t, budgeted_cents: totalByTemplate.get(t.id) || 0 })) })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/budget-templates', err)
    return NextResponse.json({ error: 'Failed to load budget templates' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('sales.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { data, error } = await tenantDb(tenantId)
      .from('budget_templates')
      .insert({
        name,
        description: (body.description as string) || null,
        target_margin_bps: body.target_margin_bps != null ? Math.round(Number(body.target_margin_bps)) : null,
      })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ template: { ...data, budgeted_cents: 0 } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/budget-templates', err)
    return NextResponse.json({ error: 'Failed to create budget template' }, { status: 500 })
  }
}
