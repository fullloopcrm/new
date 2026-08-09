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
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'
import { resolveOnboardingTenantId } from '@/lib/onboarding-auth'
import { anthropicFromStoredKey } from '@/lib/anthropic-client'
import { supabaseAdmin } from '@/lib/supabase'

const ITEM_TYPES = ['service', 'project', 'product', 'equipment']
const PER_UNITS = ['hour', 'job', 'unit', 'sqft', 'linear_ft', 'visit', 'day', 'custom']

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function resolveTenantId(tokenFromCaller: string | null): Promise<string> {
  const tenantId = await resolveOnboardingTenantId(tokenFromCaller)
  if (!tenantId) throw new AuthError('Unauthorized', 401)
  return tenantId
}

const ITEM_TYPE_NOUN: Record<string, string> = { service: 'service', project: 'project', product: 'product', equipment: 'piece of equipment' }

/**
 * Draft a short customer-facing description when the caller didn't supply
 * one -- mainly for onboarding (OnboardingCatalog.tsx), where a tenant is
 * naming items fast and shouldn't have to write ad copy for each one to
 * finish signup. Best-effort: a generation failure never blocks item
 * creation, the item just saves with no description, same as if AI
 * generation didn't exist.
 */
async function draftDescription(tenantId: string, name: string, itemType: string, priceCents: number, perUnit: string): Promise<string | null> {
  try {
    const { data: tenant } = await supabaseAdmin.from('tenants').select('name, industry, anthropic_api_key').eq('id', tenantId).single()
    if (!tenant) return null
    const client = anthropicFromStoredKey(tenant.anthropic_api_key as string | null)
    const noun = ITEM_TYPE_NOUN[itemType] || 'item'
    const priceStr = priceCents > 0 ? `$${(priceCents / 100).toLocaleString('en-US')}${perUnit !== 'job' ? ` per ${perUnit}` : ''}` : 'price not set yet'
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You write short catalog descriptions for a ${(tenant.industry as string) || 'home service'} business called "${tenant.name}". Write ONE customer-facing sentence (under 25 words, no marketing fluff, no emojis) describing this ${noun}: "${name}" (${priceStr}). Return only the sentence, nothing else.`,
      }],
    })
    const text = message.content.find((b) => b.type === 'text')
    return text && text.type === 'text' ? text.text.trim().replace(/^"|"$/g, '') : null
  } catch (err) {
    console.error('draftDescription failed:', err)
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = await resolveTenantId(searchParams.get('token'))
    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, price_is_starting, min_charge_cents, cost_cents, taxable, category, category_id, default_duration_hours, default_hourly_rate, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order, is_digital, digital_delivery_url, dropship_supplier_id, dropship_external_sku, dropship_external_variant_id')
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
    const tenantId = await resolveTenantId(typeof body.token === 'string' ? body.token : null)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const item_type = ITEM_TYPES.includes(body.item_type as string) ? (body.item_type as string) : 'service'
    const per_unit = PER_UNITS.includes(body.per_unit as string) ? (body.per_unit as string) : 'job'
    const priceCents = num(body.price_cents) ?? 0
    const description = typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : (body.autoDescribe === false ? null : await draftDescription(tenantId, name, item_type, priceCents, per_unit))

    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .insert({
        name,
        description,
        notes: (body.notes as string) || null,
        image_url: (body.image_url as string) || null,
        item_type,
        per_unit,
        unit_label: per_unit === 'custom' ? ((body.unit_label as string) || null) : null,
        price_cents: priceCents,
        price_is_starting: body.price_is_starting === true,
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
        is_digital: body.is_digital === true,
        digital_delivery_url: body.is_digital === true ? ((body.digital_delivery_url as string) || null) : null,
        dropship_supplier_id: (body.dropship_supplier_id as string) || null,
        dropship_external_sku: (body.dropship_external_sku as string)?.trim() || null,
        dropship_external_variant_id: (body.dropship_external_variant_id as string)?.trim() || null,
      })
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, price_is_starting, min_charge_cents, cost_cents, taxable, category, category_id, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order, is_digital, digital_delivery_url, dropship_supplier_id, dropship_external_sku, dropship_external_variant_id')
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
    if ('price_is_starting' in body) patch.price_is_starting = !!body.price_is_starting
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
    if ('is_digital' in body) {
      patch.is_digital = !!body.is_digital
      if (!body.is_digital) patch.digital_delivery_url = null
    }
    if ('digital_delivery_url' in body) patch.digital_delivery_url = (body.digital_delivery_url as string) || null
    if ('dropship_supplier_id' in body) patch.dropship_supplier_id = (body.dropship_supplier_id as string) || null
    if ('dropship_external_sku' in body) patch.dropship_external_sku = (body.dropship_external_sku as string)?.trim() || null
    if ('dropship_external_variant_id' in body) patch.dropship_external_variant_id = (body.dropship_external_variant_id as string)?.trim() || null

    const { data, error } = await tenantDb(tenantId)
      .from('service_types')
      .update(patch)
      .eq('id', id)
      .select('id, name, description, notes, image_url, item_type, per_unit, unit_label, price_cents, price_is_starting, min_charge_cents, cost_cents, taxable, category, category_id, default_duration_hours, default_labor_rate_cents, default_overhead_cents, default_target_margin_bps, active, sort_order, is_digital, digital_delivery_url, dropship_supplier_id, dropship_external_sku, dropship_external_variant_id')
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
    const tenantId = await resolveTenantId(searchParams.get('token'))
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
