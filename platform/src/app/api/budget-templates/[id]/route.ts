/**
 * Single budget template — get (with line items) / replace-all-and-save /
 * delete. Same replace-all-on-save semantics as quote_budgets' line items:
 * the template is the unit a user edits as a whole, not per-line.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string }> }
type LineItemInput = { service_type_id?: string | null; category_id?: string | null; label?: string; kind?: string; qty?: number; budgeted_cents?: number }

const VALID_KINDS = ['labor', 'materials', 'other']
function centsOrZero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

export async function GET(_request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('sales.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const { data: template, error } = await tenantDb(tenantId)
      .from('budget_templates')
      .select('id, name, description, target_margin_bps, active, created_at')
      .eq('id', id)
      .single()
    if (error || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const { data: lineItems } = await tenantDb(tenantId)
      .from('budget_template_line_items')
      .select('id, service_type_id, category_id, label, kind, qty, budgeted_cents, sort_order')
      .eq('budget_template_id', id)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ template: { ...template, line_items: lineItems || [] } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/budget-templates/[id]', err)
    return NextResponse.json({ error: 'Failed to load template' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('sales.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
    if ('description' in body) patch.description = (body.description as string) || null
    if ('target_margin_bps' in body) {
      patch.target_margin_bps = body.target_margin_bps != null && body.target_margin_bps !== '' ? Math.round(Number(body.target_margin_bps)) : null
    }
    if ('active' in body) patch.active = !!body.active

    const { data: template, error } = await tenantDb(tenantId)
      .from('budget_templates')
      .update(patch)
      .eq('id', id)
      .select('id, name, description, target_margin_bps, active, created_at')
      .single()
    if (error || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    if (Array.isArray(body.line_items)) {
      await tenantDb(tenantId).from('budget_template_line_items').delete().eq('budget_template_id', id)
      const rows = (body.line_items as LineItemInput[]).map((li, idx) => ({
        tenant_id: tenantId,
        budget_template_id: id,
        service_type_id: li.service_type_id || null,
        category_id: li.category_id || null,
        label: (li.label || 'Line item').slice(0, 200),
        kind: VALID_KINDS.includes(li.kind || '') ? li.kind : 'other',
        qty: Number(li.qty) > 0 ? Number(li.qty) : 1,
        budgeted_cents: centsOrZero(li.budgeted_cents),
        sort_order: idx,
      }))
      if (rows.length) await tenantDb(tenantId).from('budget_template_line_items').insert(rows)
    }

    const { data: lineItems } = await tenantDb(tenantId)
      .from('budget_template_line_items')
      .select('id, service_type_id, category_id, label, kind, qty, budgeted_cents, sort_order')
      .eq('budget_template_id', id)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ template: { ...template, line_items: lineItems || [] } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/budget-templates/[id]', err)
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('sales.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const { data, error } = await tenantDb(tenantId).from('budget_templates').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/budget-templates/[id]', err)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
