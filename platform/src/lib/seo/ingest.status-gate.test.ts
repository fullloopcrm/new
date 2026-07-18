import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * ingest.ts's ingestAllProperties() — pulls GSC Search Analytics (a
 * quota-metered API) for every discovered property. Before this fix it never
 * checked tenant status after resolving tenant_id, so a suspended/
 * cancelled/deleted tenant's property kept getting metrics pulled every run
 * indefinitely. The property registration (upsertProperty/seo_properties)
 * still happens either way -- only the metrics pull is skipped. Separate
 * file from ingest.test.ts (which covers linkTenant()'s resolver precedence)
 * to keep each file's mock surface focused.
 */

type GscSite = { siteUrl: string; permissionLevel: string }
type TenantDomainRow = { domain: string; tenant_id: string; active?: boolean }
type TenantRow = { id: string; domain: string | null; status?: string | null }

let sites: GscSite[]
let tenantDomainRows: TenantDomainRow[]
let tenantRows: TenantRow[]
let searchAnalyticsCalls: string[]

vi.mock('./gsc', () => ({
  listSites: async (): Promise<GscSite[]> => sites,
  querySearchAnalytics: async (siteUrl: string) => {
    searchAnalyticsCalls.push(siteUrl)
    return []
  },
}))

function builder(table: string) {
  const eq: Record<string, unknown> = {}
  const chain = {
    select: () => chain,
    upsert: async () => ({ data: null, error: null }),
    update: () => chain,
    eq: (col: string, val: unknown) => {
      eq[col] = val
      return chain
    },
    limit: () => chain,
    maybeSingle: async () => {
      if (table === 'tenant_domains') {
        const row = tenantDomainRows.find(
          (r) => r.domain === eq.domain && (eq.active === undefined || (r.active ?? true) === eq.active),
        )
        return { data: row ? { tenant_id: row.tenant_id } : null, error: null }
      }
      if (table === 'tenants') {
        const row = tenantRows.find((t) => t.domain === eq.domain)
        return { data: row ? { id: row.id } : null, error: null }
      }
      return { data: null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenants') {
        // nonServingTenantIds()'s select('id,status') -- no .eq() filter set.
        resolve({ data: tenantRows.map((t) => ({ id: t.id, status: t.status ?? null })), error: null })
        return
      }
      resolve({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => builder(table),
    rpc: async () => ({ data: null, error: null }),
  },
}))

import { ingestAllProperties } from './ingest'

beforeEach(() => {
  sites = []
  tenantDomainRows = []
  tenantRows = []
  searchAnalyticsCalls = []
})

describe('ingestAllProperties()', () => {
  it('pulls Search Analytics for a property linked to a still-serving tenant', async () => {
    sites = [{ siteUrl: 'sc-domain:active.com', permissionLevel: 'siteOwner' }]
    tenantDomainRows = [{ domain: 'active.com', tenant_id: 't-active' }]
    tenantRows = [{ id: 't-active', domain: null, status: 'active' }]

    const result = await ingestAllProperties()

    expect(searchAnalyticsCalls).toEqual(['sc-domain:active.com'])
    expect(result.results[0].error).toBeUndefined()
  })

  it('skips the Search Analytics pull for a property linked to a cancelled tenant (status-gate gap: was burning GSC quota indefinitely)', async () => {
    sites = [{ siteUrl: 'sc-domain:cancelled.com', permissionLevel: 'siteOwner' }]
    tenantDomainRows = [{ domain: 'cancelled.com', tenant_id: 't-cancel' }]
    tenantRows = [{ id: 't-cancel', domain: null, status: 'cancelled' }]

    const result = await ingestAllProperties()

    expect(searchAnalyticsCalls).toEqual([])
    expect(result.results[0].error).toContain('skipped')
  })

  it('never skips a property with tenant_id: null (unlinked/FL-owned)', async () => {
    sites = [{ siteUrl: 'sc-domain:unlinked.com', permissionLevel: 'siteOwner' }]
    tenantDomainRows = []
    tenantRows = []

    const result = await ingestAllProperties()

    expect(searchAnalyticsCalls).toEqual(['sc-domain:unlinked.com'])
  })

  it('wrong-tenant probe: a cancelled tenant never suppresses ingest for a different, still-serving tenant', async () => {
    sites = [
      { siteUrl: 'sc-domain:cancelled.com', permissionLevel: 'siteOwner' },
      { siteUrl: 'sc-domain:active.com', permissionLevel: 'siteOwner' },
    ]
    tenantDomainRows = [
      { domain: 'cancelled.com', tenant_id: 't-cancel' },
      { domain: 'active.com', tenant_id: 't-active' },
    ]
    tenantRows = [
      { id: 't-cancel', domain: null, status: 'cancelled' },
      { id: 't-active', domain: null, status: 'active' },
    ]

    await ingestAllProperties()

    expect(searchAnalyticsCalls).toEqual(['sc-domain:active.com'])
  })
})
