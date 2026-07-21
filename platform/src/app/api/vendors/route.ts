/**
 * Vendors CRUD — basic vendor directory (name, contact, category, address,
 * notes), tenant-scoped. Supply-linking + auto-ordering is a later feature;
 * this is just the record store.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

const COLUMNS = 'id, name, phone, email, category, address, notes, active, created_at'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { data, error } = await tenantDb(tenantId)
      .from('vendors')
      .select(COLUMNS)
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ vendors: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/vendors', err)
    return NextResponse.json({ error: 'Failed to load vendors' }, { status: 500 })
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
      .from('vendors')
      .insert({
        name,
        phone: (body.phone as string) || null,
        email: (body.email as string) || null,
        category: (body.category as string) || null,
        address: (body.address as string) || null,
        notes: (body.notes as string) || null,
      })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ vendor: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/vendors', err)
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
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
    if ('phone' in body) patch.phone = (body.phone as string) || null
    if ('email' in body) patch.email = (body.email as string) || null
    if ('category' in body) patch.category = (body.category as string) || null
    if ('address' in body) patch.address = (body.address as string) || null
    if ('notes' in body) patch.notes = (body.notes as string) || null
    if ('active' in body) patch.active = !!body.active

    const { data, error } = await tenantDb(tenantId)
      .from('vendors')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ vendor: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/vendors', err)
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { data, error } = await tenantDb(tenantId).from('vendors').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/vendors', err)
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 })
  }
}
