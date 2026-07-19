/**
 * Per-tenant Inventory CRUD (operator-side). Physical stock (supplies,
 * materials, consumables) in the `inventory_items` table -- distinct from
 * `service_types` (the sellable catalog), see 2026_07_19_inventory_items.sql.
 *
 * Tenant-scoped via requirePermission, like /api/catalog.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'

const SELECT_FIELDS =
  'id, name, sku, category, unit_label, quantity_on_hand, unit_cost_cents, reorder_threshold, notes, active, created_at, updated_at'

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('inventory.view')
    if (authError) return authError
    const { tenantId } = tenant
    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select(SELECT_FIELDS)
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/inventory error:', err)
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('inventory.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .insert({
        tenant_id: tenantId,
        name,
        sku: (body.sku as string)?.trim() || null,
        category: (body.category as string) || null,
        unit_label: (body.unit_label as string)?.trim() || 'unit',
        quantity_on_hand: num(body.quantity_on_hand) ?? 0,
        unit_cost_cents: num(body.unit_cost_cents) ?? 0,
        reorder_threshold: num(body.reorder_threshold),
        notes: (body.notes as string) || null,
        active: body.active !== false,
      })
      .select(SELECT_FIELDS)
      .single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'SKU already in use' }, { status: 409 })
      throw error
    }
    await audit({ tenantId, action: 'inventory.created', entityType: 'inventory_item', entityId: data.id })
    return NextResponse.json({ item: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/inventory error:', err)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('inventory.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const id = body.id as string | undefined
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if ('sku' in body) patch.sku = (body.sku as string)?.trim() || null
    if ('category' in body) patch.category = (body.category as string) || null
    if ('unit_label' in body) patch.unit_label = (body.unit_label as string)?.trim() || 'unit'
    if ('quantity_on_hand' in body) patch.quantity_on_hand = num(body.quantity_on_hand) ?? 0
    if ('unit_cost_cents' in body) patch.unit_cost_cents = num(body.unit_cost_cents) ?? 0
    if ('reorder_threshold' in body) patch.reorder_threshold = num(body.reorder_threshold)
    if ('notes' in body) patch.notes = (body.notes as string) || null
    if ('active' in body) patch.active = !!body.active
    patch.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(SELECT_FIELDS)
      .single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'SKU already in use' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ item: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/inventory error:', err)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('inventory.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { error } = await supabaseAdmin.from('inventory_items').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/inventory error:', err)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
