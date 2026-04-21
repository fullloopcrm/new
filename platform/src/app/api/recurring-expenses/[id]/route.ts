import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    const fields = ['label', 'category', 'amount_cents', 'frequency', 'start_date', 'end_date', 'next_due_date', 'notes', 'active']
    for (const f of fields) if (f in body) updates[f] = body[f]

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
    const { tenantId } = await getTenantForRequest()
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
