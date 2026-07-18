import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string }> }

// Same caps/validity as the POST sibling — see route.ts in the parent dir
// for why unbounded text and an unvalidated amount_cents/frequency matter
// (ledger sign-flip risk, cron advance() silent-default fallback).
const MAX_LABEL = 200
const MAX_CATEGORY = 100
const MAX_NOTES = 2000
const FREQUENCIES = new Set(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])

function validatePatch(body: Record<string, unknown>): string | null {
  if ('label' in body && (typeof body.label !== 'string' || !body.label.trim() || body.label.length > MAX_LABEL)) {
    return `label must be a non-empty string (max ${MAX_LABEL} chars)`
  }
  if ('category' in body && body.category !== null && (typeof body.category !== 'string' || body.category.length > MAX_CATEGORY)) {
    return `category max ${MAX_CATEGORY} chars`
  }
  if ('notes' in body && body.notes !== null && (typeof body.notes !== 'string' || body.notes.length > MAX_NOTES)) {
    return `notes max ${MAX_NOTES} chars`
  }
  if ('amount_cents' in body) {
    const amount = Number(body.amount_cents)
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return 'amount_cents must be a positive integer'
    }
  }
  if ('frequency' in body && (typeof body.frequency !== 'string' || !FREQUENCIES.has(body.frequency))) {
    return `frequency must be one of ${[...FREQUENCIES].join(', ')}`
  }
  return null
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('finance.expenses')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    const validationError = validatePatch(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const updates: Record<string, unknown> = {}
    const fields = ['label', 'category', 'amount_cents', 'frequency', 'start_date', 'end_date', 'next_due_date', 'notes', 'active']
    for (const f of fields) if (f in body) updates[f] = body[f]
    if ('amount_cents' in updates) updates.amount_cents = Number(updates.amount_cents)

    const { data, error } = await supabaseAdmin
      .from('recurring_expenses')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ recurring_expense: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('finance.expenses')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const { error } = await supabaseAdmin
      .from('recurring_expenses')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
