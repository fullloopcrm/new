import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'

// Columns an owner may edit on a service. Whitelist prevents mass-assignment
// of id / tenant_id / created_at via a crafted request body.
const EDITABLE_SERVICE_FIELDS = [
  'name', 'description', 'default_duration_hours', 'default_hourly_rate',
  'pricing_model', 'price_cents', 'per_unit', 'min_charge_cents',
  'unit_label', 'item_type', 'category', 'taxable', 'cost_cents', 'mode',
  'active', 'sort_order',
]

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('settings.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()
    const updates = pick(body, EDITABLE_SERVICE_FIELDS)

    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'service.updated', entityType: 'service', entityId: id })

    return NextResponse.json({ service: data })
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
    const { tenant: _authTenant, error: _authError } = await requirePermission('settings.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await audit({ tenantId, action: 'service.deleted', entityType: 'service', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
