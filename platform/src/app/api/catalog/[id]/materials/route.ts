/**
 * Bill of materials for a catalog item (service_types row) — what inventory
 * this service actually consumes per unit sold/booked. Feeds the budget
 * template (src/lib/budget-template.ts): when a BOM exists, materials cost
 * is derived from real inventory unit costs instead of the flat
 * service_types.cost_cents guess.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string }> }

const COLUMNS = 'id, service_type_id, inventory_item_id, qty_per_unit, created_at, inventory_items(id, name, unit_label, unit_cost_cents)'

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { data, error } = await tenantDb(tenantId)
      .from('catalog_item_materials')
      .select(COLUMNS)
      .eq('service_type_id', id)
      .order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ materials: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/catalog/[id]/materials', err)
    return NextResponse.json({ error: 'Failed to load materials' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const inventoryItemId = body.inventory_item_id as string | undefined
    if (!inventoryItemId) return NextResponse.json({ error: 'inventory_item_id is required' }, { status: 400 })
    const qty = Number(body.qty_per_unit)
    if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ error: 'qty_per_unit must be a positive number' }, { status: 400 })

    // Both service_type_id (the URL param) and inventory_item_id are plain
    // uuid PKs with no per-tenant namespacing and no composite/cross-tenant
    // FK constraint at the DB level. inventory_item_id is the more serious
    // gap -- this same file's GET embeds inventory_items(name, unit_label,
    // unit_cost_cents) with no additional tenant filter, so a caller who
    // supplied another tenant's real inventory_item_id would have that
    // foreign item's name and cost render on their own catalog item's BOM
    // list (an active read-leak, not just write-pollution). Verify both
    // belong to this tenant before writing anything.
    const [{ data: svc }, { data: item }] = await Promise.all([
      tenantDb(tenantId).from('service_types').select('id').eq('id', id).maybeSingle(),
      tenantDb(tenantId).from('inventory_items').select('id').eq('id', inventoryItemId).maybeSingle(),
    ])
    if (!svc) return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    if (!item) return NextResponse.json({ error: 'Invalid inventory_item_id' }, { status: 400 })

    const { data, error } = await tenantDb(tenantId)
      .from('catalog_item_materials')
      .upsert(
        { service_type_id: id, inventory_item_id: inventoryItemId, qty_per_unit: qty },
        { onConflict: 'service_type_id,inventory_item_id' },
      )
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ material: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/catalog/[id]/materials', err)
    return NextResponse.json({ error: 'Failed to add material' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const materialId = new URL(request.url).searchParams.get('id')
    if (!materialId) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { data, error } = await tenantDb(tenantId)
      .from('catalog_item_materials')
      .delete()
      .eq('id', materialId)
      .eq('service_type_id', id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/catalog/[id]/materials', err)
    return NextResponse.json({ error: 'Failed to remove material' }, { status: 500 })
  }
}
