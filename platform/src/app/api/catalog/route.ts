/**
 * Per-tenant Catalog CRUD (operator-side). One list of items in the
 * `service_types` table. Every item has a TYPE (service | project | product |
 * equipment) and is priced per hour or per job. No booking/sales mode on the
 * item — that fork lives on the deal (deals.mode).
 *
 * `equipment` is billed like a product (has a price, appears on quotes) but
 * backed by real depreciable asset rows (see 2026_07_21_equipment.sql) rather
 * than consumable stock -- a dumpster goes out and comes back, it isn't sold
 * off like a bag of mulch.
 *
 * Tenant-scoped via getTenantForRequest (operator auth), like /api/deals --
 * OR, for GET/POST/DELETE only, the same signed onboarding token /api/tenant-
 * profile accepts (resolveOnboardingTenantId), so a brand-new tenant can add
 * their first catalog items from the "Services & Pricing" onboarding step
 * before they've ever logged in. PATCH (edit) stays session-only -- editing
 * existing items isn't part of first-time onboarding.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'
import { resolveOnboardingTenantId } from '@/lib/onboarding-auth'
import { requirePermission } from '@/lib/require-permission'
import type { Permission } from '@/lib/rbac'

const ITEM_TYPES = ['service', 'project', 'product', 'equipment']
const PER_UNITS = ['hour', 'job', 'unit', 'sqft', 'linear_ft', 'visit', 'day', 'custom']

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// resolveOnboardingTenantId() tries a real session FIRST, and if one exists
// returns tenantId immediately -- with NO role/permission check at all,
// regardless of role. That's correct for the onboarding-token fallback path
// (a brand-new tenant has no session yet, so no role check is possible), but
// it meant a real, authenticated SESSION of any role -- including staff, who
// correctly lacks bookings.edit on every sibling route touching this same
// service_types table (equipment.ts, categories.ts) -- could create/edit/
// delete catalog pricing items here with zero permission check. Live,
// default-config gap, not override-dependent: staff doesn't have
// bookings.edit by default, but this route never asked.
//
// Fixed by checking the permission FIRST when a real session exists
// (requirePermission's own 401-vs-403 distinction tells us whether there
// was no session at all vs. a session with the wrong role), and only
// falling back to the onboarding token when there's genuinely no session --
// preserving the intentional pre-login onboarding flow unchanged.
async function resolveTenantId(tokenFromCaller: string | null, permission: Permission): Promise<string> {
  const { tenant, error } = await requirePermission(permission)
  if (tenant) return tenant.tenantId
  if (error.status === 401) {
    // No session at all -- fall back to the signed onboarding token.
    const tenantId = await resolveOnboardingTenantId(tokenFromCaller)
    if (tenantId) return tenantId
  }
  // Either a real session with the wrong role (403), or no session and no
  // valid token (401) -- both are a genuine denial, not a fallback case.
  throw new AuthError(error.status === 403 ? 'Forbidden' : 'Unauthorized', error.status)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = await resolveTenantId(searchParams.get('token'), 'bookings.view')
    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, min_charge_cents, cost_cents, taxable, category, category_id, default_duration_hours, default_hourly_rate, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order')
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
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const tenantId = await resolveTenantId(typeof body.token === 'string' ? body.token : null, 'bookings.edit')
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
        category_id: (body.category_id as string) || null,
        default_duration_hours: num(body.default_duration_hours),
        default_labor_rate_cents: num(body.default_labor_rate_cents),
        default_overhead_cents: num(body.default_overhead_cents),
        default_target_margin_bps: num(body.default_target_margin_bps),
        sort_order: num(body.sort_order) ?? 0,
        active: body.active !== false,
      })
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, min_charge_cents, cost_cents, taxable, category, category_id, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order')
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
    // Session-only by design (editing existing items isn't part of
    // first-time onboarding, see the file header comment) -- but this
    // called bare getTenantForRequest() with no permission check, the same
    // live gap as GET/POST/DELETE's session path. Fixed to require
    // bookings.edit, matching the sibling equipment.ts/categories.ts routes
    // over the same service_types table.
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
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
    if ('category_id' in body) patch.category_id = (body.category_id as string) || null
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
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, min_charge_cents, cost_cents, taxable, category, category_id, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order')
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
    const { searchParams } = new URL(request.url)
    const tenantId = await resolveTenantId(searchParams.get('token'), 'bookings.edit')
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
