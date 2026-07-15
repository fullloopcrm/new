import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    for (const k of ['name', 'institution', 'type', 'mask', 'coa_id', 'active', 'current_balance_cents', 'as_of_date']) {
      if (k in body) updates[k] = body[k]
    }

    // coa_id is a caller-supplied FK — chart_of_accounts carries its own
    // tenant_id, and GET embeds chart_of_accounts(code, name, type) off this
    // row, so a foreign id would leak another tenant's GL account name.
    if ('coa_id' in updates && updates.coa_id) {
      const { data: owned } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id')
        .eq('id', updates.coa_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Invalid coa_id' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ bank_account: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const { error } = await supabaseAdmin
      .from('bank_accounts')
      .update({ active: false })
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
