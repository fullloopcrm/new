import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
// GET reads via listEntities(), which is already tenant-scoped (.eq('tenant_id')).
import { listEntities } from '@/lib/entity'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const entities = await listEntities(tenantId)
    return NextResponse.json({ entities })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    // tenantDb auto-injects/stamps tenant_id on the update + insert below.
    const db = tenantDb(tenantId)
    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    // If make_default, unset any existing default first (unique partial index enforces one)
    if (body.make_default) {
      await db.from('entities').update({ is_default: false }).eq('is_default', true)
    }

    const { data, error } = await db
      .from('entities')
      .insert({
        name: body.name,
        legal_name: body.legal_name || null,
        ein: body.ein || null,
        entity_type: body.entity_type || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        fiscal_year_start: body.fiscal_year_start || 1,
        is_default: !!body.make_default,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ entity: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/entities', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
