/**
 * Equipment CRUD — depreciable physical assets (dumpsters, generators,
 * skid-steers) that get checked out and returned rather than consumed.
 * Optionally tied to a catalog `service_types` row (item_type='equipment')
 * when the unit is directly billed to customers; nullable for internal-use
 * equipment that's never sold.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

const COLUMNS =
  'id, service_type_id, category_id, name, asset_tag, acquisition_cost_cents, acquisition_date, useful_life_months, salvage_value_cents, depreciation_method, accumulated_depreciation_cents, status, notes, active, created_at'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { data, error } = await tenantDb(tenantId)
      .from('equipment')
      .select(COLUMNS)
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ equipment: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/equipment', err)
    return NextResponse.json({ error: 'Failed to load equipment' }, { status: 500 })
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
      .from('equipment')
      .insert({
        name,
        service_type_id: (body.service_type_id as string) || null,
        category_id: (body.category_id as string) || null,
        asset_tag: (body.asset_tag as string) || null,
        acquisition_cost_cents: Number(body.acquisition_cost_cents) || 0,
        acquisition_date: (body.acquisition_date as string) || null,
        useful_life_months: body.useful_life_months != null && body.useful_life_months !== '' ? Number(body.useful_life_months) : null,
        salvage_value_cents: Number(body.salvage_value_cents) || 0,
        status: (body.status as string) || 'available',
        notes: (body.notes as string) || null,
      })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ equipment: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/equipment', err)
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
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
    if ('service_type_id' in body) patch.service_type_id = (body.service_type_id as string) || null
    if ('category_id' in body) patch.category_id = (body.category_id as string) || null
    if ('asset_tag' in body) patch.asset_tag = (body.asset_tag as string) || null
    if ('acquisition_cost_cents' in body) patch.acquisition_cost_cents = Number(body.acquisition_cost_cents) || 0
    if ('acquisition_date' in body) patch.acquisition_date = (body.acquisition_date as string) || null
    if ('useful_life_months' in body) {
      patch.useful_life_months = body.useful_life_months != null && body.useful_life_months !== '' ? Number(body.useful_life_months) : null
    }
    if ('salvage_value_cents' in body) patch.salvage_value_cents = Number(body.salvage_value_cents) || 0
    if ('status' in body) patch.status = (body.status as string) || 'available'
    if ('notes' in body) patch.notes = (body.notes as string) || null
    if ('active' in body) patch.active = !!body.active

    const { data, error } = await tenantDb(tenantId)
      .from('equipment')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ equipment: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/equipment', err)
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { data, error } = await tenantDb(tenantId).from('equipment').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/equipment', err)
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
  }
}
