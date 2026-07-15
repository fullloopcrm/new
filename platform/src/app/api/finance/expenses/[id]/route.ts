import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'
import { pick } from '@/lib/validate'
import { isEntityOwnedByTenant } from '@/lib/entity'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, ['category', 'subcategory', 'amount', 'description', 'receipt_url', 'date', 'vendor_name', 'payment_method', 'tax_deductible', 'entity_id'])

    if (fields.amount) fields.amount = Math.round(Number(fields.amount) * 100)
    if (fields.entity_id && !(await isEntityOwnedByTenant(tenantId, fields.entity_id as string))) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Caller-supplied FK — verify it belongs to this tenant before update, so a
    // foreign id can't repoint the expense at another tenant's accounting entity.
    if (fields.entity_id) {
      const { data: owned } = await tenantDb(tenantId)
        .from('entities')
        .select('id')
        .eq('id', fields.entity_id as string)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Invalid entity_id' }, { status: 404 })
    }

    const { data, error } = await tenantDb(tenantId)
      .from('expenses')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ expense: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const { error } = await tenantDb(tenantId)
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'expense.deleted', entityType: 'expense', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
