import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { listProperties, updateProperty } from '@/lib/client-properties'
import { audit } from '@/lib/audit'

// Dashboard-scoped client property read/edit (lot size, etc.) — requirePermission
// (Clerk session), NOT the customer-portal /api/client/properties route, which
// authenticates via a client-portal token/legacy admin cookie that a dashboard
// session doesn't carry. This is what /dashboard/clients needs to record a
// property's lot_size_sqft for sqft-tiered lawn-care pricing.

async function ownedClientTenantId(clientId: string, tenantId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('clients').select('id').eq('id', clientId).eq('tenant_id', tenantId).maybeSingle()
  return !!data
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.view')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params

    if (!(await ownedClientTenantId(id, tenantId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const properties = await listProperties(id)
    return NextResponse.json({ properties })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const propertyId = body.property_id
    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'property_id required' }, { status: 400 })
    }
    if (!(await ownedClientTenantId(id, tenantId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let lotSizeSqft: number | null | undefined
    if (body.lot_size_sqft === null) {
      lotSizeSqft = null
    } else if (body.lot_size_sqft !== undefined) {
      const n = Number(body.lot_size_sqft)
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json({ error: 'lot_size_sqft must be a positive number' }, { status: 400 })
      }
      lotSizeSqft = Math.round(n)
    }

    const updated = await updateProperty(id, propertyId, { lot_size_sqft: lotSizeSqft }, { changedBy: 'admin', actorId: tenantId, source: 'admin' })
    if (!updated) return NextResponse.json({ error: 'Failed to update property' }, { status: 500 })

    await audit({ tenantId, action: 'client_property.updated', entityType: 'client_property', entityId: propertyId, details: { lot_size_sqft: lotSizeSqft } })

    return NextResponse.json({ property: updated })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
