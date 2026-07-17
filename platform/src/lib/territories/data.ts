/**
 * Territory system data layer.
 * One tenant per category per territory. Reusable by the admin map now and
 * a public (status-only, no PII) map later — keep PII out of the *public*
 * shape when that endpoint is added.
 */
import { supabaseAdmin } from '@/lib/supabase'

export type ClaimStatus = 'available' | 'pending' | 'claimed'

export interface Category {
  id: string
  slug: string
  name: string
}

export interface Territory {
  id: string
  slug: string
  name: string
  kind: 'metro' | 'micro' | 'rural'
  state_abbr: string | null
  center_lat: number | null
  center_lng: number | null
}

export interface CategoryClaim {
  territory_id: string
  status: Exclude<ClaimStatus, 'available'>
  tenant_id: string | null
  tenant_name: string | null
}

export interface TenantPin {
  id: string
  name: string
  slug: string | null
  industry: string | null
  lat: number
  lng: number
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await supabaseAdmin
    .from('service_categories')
    .select('id, slug, name')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  return data ?? []
}

export async function getTerritories(): Promise<Territory[]> {
  const { data } = await supabaseAdmin
    .from('territories')
    .select('id, slug, name, kind, state_abbr, center_lat, center_lng')
  return (data ?? []) as Territory[]
}

/** fips -> territory_id, for coloring county polygons by their territory. */
export async function getCountyToTerritory(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const { data } = await supabaseAdmin
    .from('counties')
    .select('fips, territory_id')
  for (const row of data ?? []) {
    if (row.territory_id) map[row.fips as string] = row.territory_id as string
  }
  return map
}

/** Active claims for one category. Missing territory => available. */
export async function getClaimsForCategory(categoryId: string): Promise<CategoryClaim[]> {
  const { data } = await supabaseAdmin
    .from('territory_claims')
    .select('territory_id, status, tenant_id, tenants(name)')
    .eq('category_id', categoryId)
  return (data ?? []).map((r) => {
    const t = r.tenants as { name?: string } | { name?: string }[] | null
    const tenant_name = Array.isArray(t) ? (t[0]?.name ?? null) : (t?.name ?? null)
    return {
      territory_id: r.territory_id as string,
      status: r.status as CategoryClaim['status'],
      tenant_id: (r.tenant_id as string | null) ?? null,
      tenant_name,
    }
  })
}

export interface TenantLite {
  id: string
  name: string
  industry: string | null
}

/** All tenants (id/name) for the claim-assignment dropdown. */
export async function getTenantsLite(): Promise<TenantLite[]> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, name, industry')
    .order('name', { ascending: true })
  return (data ?? []).map((t) => ({
    id: t.id as string,
    name: (t.name as string) ?? 'Unnamed',
    industry: (t.industry as string | null) ?? null,
  }))
}

export async function getTenantPins(): Promise<TenantPin[]> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, industry, hq_latitude, hq_longitude')
    .not('hq_latitude', 'is', null)
    .not('hq_longitude', 'is', null)
  return (data ?? [])
    .map((t) => ({
      id: t.id as string,
      name: (t.name as string) ?? 'Unnamed',
      slug: (t.slug as string | null) ?? null,
      industry: (t.industry as string | null) ?? null,
      lat: Number(t.hq_latitude),
      lng: Number(t.hq_longitude),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
}

/**
 * Claim (or set pending) a territory for a category. If a claim already
 * exists for this (territory, category) — the admin transitioning
 * pending<->claimed or reassigning the tenant on their own selection —
 * it's updated in place. Otherwise it's inserted fresh, protected by the
 * DB's unique index (territory_id, category_id): a genuine concurrent
 * claim on a still-available combo conflicts instead of silently landing.
 */
export async function claimTerritory(args: {
  territoryId: string
  categoryId: string
  tenantId?: string | null
  status?: 'pending' | 'claimed'
  notes?: string | null
}): Promise<{ ok: true } | { ok: false; error: string; conflict?: boolean }> {
  const status = args.status ?? 'claimed'
  const fields = {
    tenant_id: args.tenantId ?? null,
    status,
    claimed_at: status === 'claimed' ? new Date().toISOString() : null,
    pending_since: status === 'pending' ? new Date().toISOString() : null,
    notes: args.notes ?? null,
  }

  const { data: existing } = await supabaseAdmin
    .from('territory_claims')
    .select('id')
    .eq('territory_id', args.territoryId)
    .eq('category_id', args.categoryId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('territory_claims')
      .update(fields)
      .eq('id', existing.id as string)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  const { error } = await supabaseAdmin.from('territory_claims').insert({
    territory_id: args.territoryId,
    category_id: args.categoryId,
    ...fields,
  })
  if (error) {
    const conflict = error.code === '23505'
    return {
      ok: false,
      conflict,
      error: conflict
        ? 'This territory is already claimed for that category.'
        : error.message,
    }
  }
  return { ok: true }
}

export async function releaseTerritory(territoryId: string, categoryId: string) {
  const { error } = await supabaseAdmin
    .from('territory_claims')
    .delete()
    .eq('territory_id', territoryId)
    .eq('category_id', categoryId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}
