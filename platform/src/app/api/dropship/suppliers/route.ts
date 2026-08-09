/**
 * Dropship supplier registry — tenant-scoped CRUD. adapter_key selects the
 * DropshipAdapter (src/lib/dropship/registry.ts) that handles this supplier;
 * 'manual' is the only one that exists today.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { listAdapters } from '@/lib/dropship/registry'

const COLUMNS = 'id, name, adapter_key, config, active, created_at, updated_at'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await tenantDb(tenantId)
      .from('dropship_suppliers')
      .select(COLUMNS)
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ suppliers: data || [], adapters: listAdapters().map((a) => ({ key: a.key, label: a.label })) })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/dropship/suppliers', err)
    return NextResponse.json({ error: 'Failed to load suppliers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const adapterKey = typeof body.adapter_key === 'string' && body.adapter_key ? body.adapter_key : 'manual'
    const config = body.config && typeof body.config === 'object' ? body.config : {}

    const { data, error } = await tenantDb(tenantId)
      .from('dropship_suppliers')
      .insert({ name, adapter_key: adapterKey, config })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ supplier: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/dropship/suppliers', err)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const id = body.id as string | undefined
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if (typeof body.adapter_key === 'string') patch.adapter_key = body.adapter_key
    if (body.config && typeof body.config === 'object') patch.config = body.config
    if ('active' in body) patch.active = !!body.active

    const { data, error } = await tenantDb(tenantId)
      .from('dropship_suppliers')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ supplier: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/dropship/suppliers', err)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { data, error } = await tenantDb(tenantId).from('dropship_suppliers').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/dropship/suppliers', err)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
