/**
 * Vendor <-> inventory item links (vendor_items) — which inventory items a
 * vendor supplies, at what cost, and which vendor is preferred for an item.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

type Params = { params: Promise<{ id: string }> }

const COLUMNS = 'id, vendor_id, inventory_item_id, unit_cost_cents, lead_time_days, is_preferred, notes, created_at, inventory_items(id, name, unit_label)'

export async function GET(_request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const { data, error } = await tenantDb(tenantId)
      .from('vendor_items')
      .select(COLUMNS)
      .eq('vendor_id', id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/vendors/[id]/items', err)
    return NextResponse.json({ error: 'Failed to load vendor items' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const inventoryItemId = body.inventory_item_id as string | undefined
    if (!inventoryItemId) return NextResponse.json({ error: 'inventory_item_id is required' }, { status: 400 })

    if (body.is_preferred) {
      await tenantDb(tenantId).from('vendor_items').update({ is_preferred: false }).eq('inventory_item_id', inventoryItemId)
    }

    const { data, error } = await tenantDb(tenantId)
      .from('vendor_items')
      .upsert(
        {
          vendor_id: id,
          inventory_item_id: inventoryItemId,
          unit_cost_cents: Number(body.unit_cost_cents) || 0,
          lead_time_days: body.lead_time_days != null && body.lead_time_days !== '' ? Number(body.lead_time_days) : null,
          is_preferred: !!body.is_preferred,
          notes: (body.notes as string) || null,
        },
        { onConflict: 'vendor_id,inventory_item_id' },
      )
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/vendors/[id]/items', err)
    return NextResponse.json({ error: 'Failed to link inventory item' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const linkId = new URL(request.url).searchParams.get('id')
    if (!linkId) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { data, error } = await tenantDb(tenantId)
      .from('vendor_items')
      .delete()
      .eq('id', linkId)
      .eq('vendor_id', id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/vendors/[id]/items', err)
    return NextResponse.json({ error: 'Failed to unlink inventory item' }, { status: 500 })
  }
}
