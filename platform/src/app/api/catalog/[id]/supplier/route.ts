/**
 * Links a catalog item (service_types row, item_type='product') to the
 * dropship supplier that fulfills it, plus that supplier's own SKU. One
 * supplier per product (see 20260808235355_add_dropship_supplier_backend.sql
 * for why this isn't a join table yet).
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string }> }

const COLUMNS = 'id, dropship_supplier_id, dropship_external_sku'

export async function PUT(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const supplierId = body.dropship_supplier_id as string | null | undefined
    if (supplierId === undefined) return NextResponse.json({ error: 'dropship_supplier_id is required' }, { status: 400 })
    const externalSku = typeof body.dropship_external_sku === 'string' ? body.dropship_external_sku.trim() || null : null

    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .update({ dropship_supplier_id: supplierId, dropship_external_sku: externalSku })
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/catalog/[id]/supplier', err)
    return NextResponse.json({ error: 'Failed to link supplier' }, { status: 500 })
  }
}
