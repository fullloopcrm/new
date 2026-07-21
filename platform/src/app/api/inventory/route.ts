/**
 * Inventory items CRUD — physical stock (materials, supplies, consumables),
 * tenant-scoped. Distinct from service_types (sellable catalog items); an
 * inventory item is what a catalog item's bill of materials consumes and
 * what a vendor supplies (see catalog_item_materials, vendor_items).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

const COLUMNS = 'id, name, sku, category, unit_label, quantity_on_hand, unit_cost_cents, reorder_threshold, notes, active, created_at'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { data, error } = await tenantDb(tenantId)
      .from('inventory_items')
      .select(COLUMNS)
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/inventory', err)
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { data, error } = await tenantDb(tenantId)
      .from('inventory_items')
      .insert({
        name,
        sku: (body.sku as string) || null,
        category: (body.category as string) || null,
        unit_label: (body.unit_label as string) || 'unit',
        quantity_on_hand: Number(body.quantity_on_hand) || 0,
        unit_cost_cents: Number(body.unit_cost_cents) || 0,
        reorder_threshold: body.reorder_threshold != null && body.reorder_threshold !== '' ? Number(body.reorder_threshold) : null,
        notes: (body.notes as string) || null,
      })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/inventory', err)
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const id = body.id as string | undefined
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if ('sku' in body) patch.sku = (body.sku as string) || null
    if ('category' in body) patch.category = (body.category as string) || null
    if ('unit_label' in body) patch.unit_label = (body.unit_label as string) || 'unit'
    if ('quantity_on_hand' in body) patch.quantity_on_hand = Number(body.quantity_on_hand) || 0
    if ('unit_cost_cents' in body) patch.unit_cost_cents = Number(body.unit_cost_cents) || 0
    if ('reorder_threshold' in body) {
      patch.reorder_threshold = body.reorder_threshold != null && body.reorder_threshold !== '' ? Number(body.reorder_threshold) : null
    }
    if ('notes' in body) patch.notes = (body.notes as string) || null
    if ('active' in body) patch.active = !!body.active

    const { data, error } = await tenantDb(tenantId)
      .from('inventory_items')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/inventory', err)
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { data, error } = await tenantDb(tenantId).from('inventory_items').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/inventory', err)
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 })
  }
}
