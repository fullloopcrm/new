/**
 * Per-tenant Catalog CRUD (operator-side). One list of items in the
 * `service_types` table. Every item has a TYPE (service | project | product)
 * and is priced per hour or per job. No booking/sales mode on the item — that
 * fork lives on the deal (deals.mode).
 *
 * Tenant-scoped via getTenantForRequest (operator auth), like /api/deals.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'

const ITEM_TYPES = ['service', 'project', 'product']
const PER_UNITS = ['hour', 'job', 'unit', 'sqft', 'linear_ft', 'visit', 'day', 'custom']

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, min_charge_cents, cost_cents, taxable, category, default_duration_hours, default_hourly_rate, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order')
      .order('sort_order', { ascending: true })
    if (error) throw error
    // Legacy/seeded rows carry the hourly rate in the OLD booking column
    // (default_hourly_rate) but leave the SKU column (price_cents) NULL, which
    // renders every seeded service as $0 in the quote builder. Fall back to the
    // hourly rate so existing tenants can quote without retyping prices.
    const items = (data || []).map((row) => {
      const { default_hourly_rate, ...rest } = row as typeof row & { default_hourly_rate: number | null }
      const priceCents =
        rest.price_cents ?? (default_hourly_rate != null ? Math.round(default_hourly_rate * 100) : null)
      return {
        ...rest,
        price_cents: priceCents,
        per_unit: rest.per_unit ?? (rest.price_cents == null && default_hourly_rate != null ? 'hour' : rest.per_unit),
      }
    })
    return NextResponse.json({ items })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/catalog error:', err)
    return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const item_type = ITEM_TYPES.includes(body.item_type as string) ? (body.item_type as string) : 'service'
    const per_unit = PER_UNITS.includes(body.per_unit as string) ? (body.per_unit as string) : 'job'

    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .insert({
        name,
        description: (body.description as string) || null,
        notes: (body.notes as string) || null,
        image_url: (body.image_url as string) || null,
        item_type,
        per_unit,
        unit_label: per_unit === 'custom' ? ((body.unit_label as string) || null) : null,
        price_cents: num(body.price_cents) ?? 0,
        min_charge_cents: num(body.min_charge_cents),
        cost_cents: num(body.cost_cents),
        taxable: body.taxable !== false,
        category: (body.category as string) || null,
        default_duration_hours: num(body.default_duration_hours),
        default_labor_rate_cents: num(body.default_labor_rate_cents),
        default_overhead_cents: num(body.default_overhead_cents),
        default_target_margin_bps: num(body.default_target_margin_bps),
        sort_order: num(body.sort_order) ?? 0,
        active: body.active !== false,
      })
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, min_charge_cents, cost_cents, taxable, category, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order')
      .single()
    if (error) throw error
    await audit({ tenantId, action: 'service.created', entityType: 'catalog_item', entityId: data.id })
    return NextResponse.json({ item: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/catalog error:', err)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
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
    if ('description' in body) patch.description = (body.description as string) || null
    if ('notes' in body) patch.notes = (body.notes as string) || null
    if ('image_url' in body) patch.image_url = (body.image_url as string) || null
    if ('active' in body) patch.active = !!body.active
    if ('sort_order' in body) patch.sort_order = num(body.sort_order) ?? 0
    if ('price_cents' in body) patch.price_cents = num(body.price_cents) ?? 0
    if ('min_charge_cents' in body) patch.min_charge_cents = num(body.min_charge_cents)
    if ('cost_cents' in body) patch.cost_cents = num(body.cost_cents)
    if ('taxable' in body) patch.taxable = !!body.taxable
    if ('category' in body) patch.category = (body.category as string) || null
    if ('default_duration_hours' in body) patch.default_duration_hours = num(body.default_duration_hours)
    if ('default_labor_rate_cents' in body) patch.default_labor_rate_cents = num(body.default_labor_rate_cents)
    if ('default_overhead_cents' in body) patch.default_overhead_cents = num(body.default_overhead_cents)
    if ('default_target_margin_bps' in body) patch.default_target_margin_bps = num(body.default_target_margin_bps)
    if ('unit_label' in body) patch.unit_label = (body.unit_label as string) || null
    if (ITEM_TYPES.includes(body.item_type as string)) patch.item_type = body.item_type
    if (PER_UNITS.includes(body.per_unit as string)) {
      patch.per_unit = body.per_unit
      if (body.per_unit !== 'custom') patch.unit_label = null
    }

    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .update(patch)
      .eq('id', id)
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, min_charge_cents, cost_cents, taxable, category, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order')
      .single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/catalog error:', err)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { data, error } = await tenantDb(tenantId).from('service_types').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/catalog error:', err)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
