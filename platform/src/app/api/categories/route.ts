/**
 * Shared category tree — used by Catalog (service_types), Vendors, and
 * Inventory (see 2026_07_21_shared_categories.sql). A category can carry a
 * default revenue and/or COGS chart-of-accounts link so tagging an item
 * tells the system which ledger account it belongs in.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

const COLUMNS = 'id, name, parent_id, default_revenue_account_id, default_cogs_account_id, active, created_at'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { data, error } = await tenantDb(tenantId)
      .from('categories')
      .select(COLUMNS)
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ categories: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/categories', err)
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
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

    const parentId = (body.parent_id as string) || null
    if (parentId) {
      const { data: parent } = await tenantDb(tenantId).from('categories').select('id').eq('id', parentId).maybeSingle()
      if (!parent) return NextResponse.json({ error: 'Invalid parent_id' }, { status: 400 })
    }

    const { data, error } = await tenantDb(tenantId)
      .from('categories')
      .insert({
        name,
        parent_id: parentId,
        default_revenue_account_id: (body.default_revenue_account_id as string) || null,
        default_cogs_account_id: (body.default_cogs_account_id as string) || null,
      })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ category: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/categories', err)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
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

    if (body.parent_id === id) return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if ('parent_id' in body) patch.parent_id = (body.parent_id as string) || null
    if ('default_revenue_account_id' in body) patch.default_revenue_account_id = (body.default_revenue_account_id as string) || null
    if ('default_cogs_account_id' in body) patch.default_cogs_account_id = (body.default_cogs_account_id as string) || null
    if ('active' in body) patch.active = !!body.active

    const { data, error } = await tenantDb(tenantId)
      .from('categories')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ category: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/categories', err)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { data, error } = await tenantDb(tenantId).from('categories').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/categories', err)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
