/**
 * Master Catalog — Packages CRUD (operator-side). A package bundles several
 * existing catalog items (each keeping its own name/description) under one
 * package title + description, so a Proposal can pick one package instead of
 * building line items by hand. Backed by `catalog_packages` (items stored as
 * a snapshotted jsonb array — see migrations/2026_07_19_catalog_packages.sql).
 *
 * Tenant-scoped via getTenantForRequest; mutations gated on sales.edit, same
 * as the sibling /api/catalog route for the same "who can price things" surface.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'

export interface PackageItem {
  id: string
  catalog_item_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price_cents: number
}

// Packages feed straight into a proposal's line items (public-facing once
// sent), so cap array length and per-field string length the same way
// src/lib/quote.ts caps quote line_items -- no unbounded array/string can
// reach a row that later renders on the public /quote/[token] page.
const MAX_PACKAGE_ITEMS = 100
const MAX_ITEM_NAME = 200
const MAX_ITEM_DESC = 2000
const MAX_NAME = 200
const MAX_DESCRIPTION = 2000

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizePackageItems(items: unknown): PackageItem[] {
  if (!Array.isArray(items)) return []
  return items
    .slice(0, MAX_PACKAGE_ITEMS)
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
    .filter((it) => typeof it.name === 'string' && it.name.trim().length > 0)
    .map((it, i) => {
      const quantity = Number(it.quantity)
      const price = Number(it.unit_price_cents)
      return {
        id: typeof it.id === 'string' && it.id ? it.id : `pi_${i}_${Date.now()}`,
        catalog_item_id: typeof it.catalog_item_id === 'string' ? it.catalog_item_id : null,
        name: String(it.name).slice(0, MAX_ITEM_NAME),
        description: it.description ? String(it.description).slice(0, MAX_ITEM_DESC) : null,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unit_price_cents: Number.isFinite(price) && price > 0 ? Math.round(price) : 0,
      }
    })
}

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await supabaseAdmin
      .from('catalog_packages')
      .select('id, name, description, items, active, sort_order')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return NextResponse.json({ packages: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/catalog/packages error:', err)
    return NextResponse.json({ error: 'Failed to load packages' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('catalog_packages')
      .insert({
        tenant_id: tenantId,
        name: name.slice(0, MAX_NAME),
        description: body.description ? String(body.description).slice(0, MAX_DESCRIPTION) : null,
        items: normalizePackageItems(body.items),
        sort_order: num(body.sort_order) ?? 0,
        active: body.active !== false,
      })
      .select('id, name, description, items, active, sort_order')
      .single()
    if (error) throw error
    await audit({ tenantId, action: 'package.created', entityType: 'catalog_package', entityId: data.id })
    return NextResponse.json({ package: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/catalog/packages error:', err)
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const id = body.id as string | undefined
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim().slice(0, MAX_NAME)
    if ('description' in body) patch.description = body.description ? String(body.description).slice(0, MAX_DESCRIPTION) : null
    if ('items' in body) patch.items = normalizePackageItems(body.items)
    if ('active' in body) patch.active = !!body.active
    if ('sort_order' in body) patch.sort_order = num(body.sort_order) ?? 0

    const { data, error } = await supabaseAdmin
      .from('catalog_packages')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, name, description, items, active, sort_order')
      .single()
    if (error) throw error
    await audit({ tenantId, action: 'package.updated', entityType: 'catalog_package', entityId: id })
    return NextResponse.json({ package: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/catalog/packages error:', err)
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { error } = await supabaseAdmin.from('catalog_packages').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) throw error
    await audit({ tenantId, action: 'package.deleted', entityType: 'catalog_package', entityId: id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/catalog/packages error:', err)
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
  }
}
