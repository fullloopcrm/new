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

/**
 * fips -> territory_id, for coloring county polygons by their territory.
 * Paginated: Supabase caps a single select at 1000 rows, but there are 3,144
 * counties — without paging, ~2/3 of the map would render uncolored.
 */
export async function getCountyToTerritory(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabaseAdmin
      .from('counties')
      .select('fips, territory_id')
      .range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    for (const row of data) {
      if (row.territory_id) map[row.fips as string] = row.territory_id as string
    }
    if (data.length < PAGE) break
  }
  return map
}

export interface TerritorySearchResult {
  territory_id: string
  name: string
  kind: string
  state: string | null
  match: string // human label of what matched (ZIP, county, metro name)
}

function coerceTerritory(rel: unknown): { id: string; name: string; kind: string; state_abbr: string | null } | null {
  const t = Array.isArray(rel) ? rel[0] : rel
  if (!t || typeof t !== 'object') return null
  const o = t as Record<string, unknown>
  if (!o.id) return null
  return { id: o.id as string, name: (o.name as string) ?? '', kind: (o.kind as string) ?? '', state_abbr: (o.state_abbr as string | null) ?? null }
}

/** Search territories by ZIP, county name, metro name, or state — instead of map-hunting. */
export async function searchTerritories(q: string): Promise<TerritorySearchResult[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const out = new Map<string, TerritorySearchResult>()

  // ZIP → county → territory
  if (/^\d{5}$/.test(query)) {
    const { data: zc } = await supabaseAdmin.from('zip_counties').select('fips').eq('zip', query)
    const fipsList = (zc ?? []).map((r) => r.fips as string)
    if (fipsList.length) {
      const { data: cs } = await supabaseAdmin
        .from('counties')
        .select('name, state_abbr, territories(id,name,kind,state_abbr)')
        .in('fips', fipsList)
      for (const c of cs ?? []) {
        const t = coerceTerritory((c as Record<string, unknown>).territories)
        if (t) out.set(t.id, { territory_id: t.id, name: t.name, kind: t.kind, state: t.state_abbr, match: `ZIP ${query} · ${c.name as string}, ${c.state_abbr as string}` })
      }
    }
    return [...out.values()]
  }

  // Metro/rural name or state code
  const { data: terr } = await supabaseAdmin
    .from('territories')
    .select('id,name,kind,state_abbr')
    .or(`name.ilike.%${query}%,state_abbr.ilike.${query}`)
    .limit(20)
  for (const t of terr ?? [])
    out.set(t.id as string, { territory_id: t.id as string, name: t.name as string, kind: t.kind as string, state: (t.state_abbr as string | null) ?? null, match: `${t.kind as string} territory` })

  // County name → its territory
  const { data: cs } = await supabaseAdmin
    .from('counties')
    .select('name, state_abbr, territories(id,name,kind,state_abbr)')
    .ilike('name', `%${query}%`)
    .limit(20)
  for (const c of cs ?? []) {
    const t = coerceTerritory((c as Record<string, unknown>).territories)
    if (t && !out.has(t.id)) out.set(t.id, { territory_id: t.id, name: t.name, kind: t.kind, state: t.state_abbr, match: `${c.name as string}, ${c.state_abbr as string}` })
  }

  return [...out.values()].slice(0, 25)
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
 * Claim (or set pending) a territory for a category. The DB unique index
 * (territory_id, category_id) makes a second active claim impossible — a
 * conflict here means the combo is already taken.
 */
export async function claimTerritory(args: {
  territoryId: string
  categoryId: string
  tenantId?: string | null
  status?: 'pending' | 'claimed'
  notes?: string | null
}): Promise<{ ok: true } | { ok: false; error: string; conflict?: boolean }> {
  const status = args.status ?? 'claimed'
  const { error } = await supabaseAdmin.from('territory_claims').insert({
    territory_id: args.territoryId,
    category_id: args.categoryId,
    tenant_id: args.tenantId ?? null,
    status,
    claimed_at: status === 'claimed' ? new Date().toISOString() : null,
    pending_since: status === 'pending' ? new Date().toISOString() : null,
    notes: args.notes ?? null,
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
