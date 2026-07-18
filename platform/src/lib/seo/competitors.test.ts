import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * competitors.ts's runCompetitorScan() — spends paid SERPER_API_KEY quota
 * (~$0.0003/query) per tracked keyword, per property. Before this fix it
 * read seo_properties with zero tenant-status check, so a suspended/
 * cancelled/deleted tenant's site kept burning that paid quota indefinitely.
 * This test only exercises the property-selection gate (result.properties) —
 * seo_money_keywords RPC is mocked to return no keywords, so no property
 * reaches an actual SERP call either way.
 */

type PropertyRow = { property: string; domain: string | null; tenant_id: string | null }
type TenantRow = { id: string; status: string | null }

let propertyRows: PropertyRow[]
let tenantRows: TenantRow[]

vi.mock('./serp', () => ({
  serpEnabled: () => true,
  fetchSerp: async () => {
    throw new Error('not reached in test')
  },
  urlToDomain: (url: string) => url,
}))

function builder(table: string) {
  const chain = {
    select: () => chain,
    delete: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'seo_properties') {
        resolve({ data: propertyRows, error: null })
        return
      }
      if (table === 'tenants') {
        resolve({ data: tenantRows, error: null })
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
    rpc: async () => ({ data: [], error: null }), // seo_money_keywords -- no candidates
  },
}))

import { runCompetitorScan } from './competitors'

beforeEach(() => {
  propertyRows = []
  tenantRows = []
})

describe('runCompetitorScan()', () => {
  it('scans a property linked to a still-serving tenant', async () => {
    propertyRows = [{ property: 'sc-domain:active.com', domain: 'active.com', tenant_id: 't-active' }]
    tenantRows = [{ id: 't-active', status: 'active' }]

    const result = await runCompetitorScan()

    expect(result.properties).toBe(1)
  })

  it('excludes a property linked to a cancelled tenant (status-gate gap: was burning paid SERP quota indefinitely)', async () => {
    propertyRows = [{ property: 'sc-domain:cancelled.com', domain: 'cancelled.com', tenant_id: 't-cancel' }]
    tenantRows = [{ id: 't-cancel', status: 'cancelled' }]

    const result = await runCompetitorScan()

    expect(result.properties).toBe(0)
  })

  it('never excludes a property with tenant_id: null (unlinked/FL-owned)', async () => {
    propertyRows = [{ property: 'sc-domain:unlinked.com', domain: 'unlinked.com', tenant_id: null }]
    tenantRows = []

    const result = await runCompetitorScan()

    expect(result.properties).toBe(1)
  })

  it('wrong-tenant probe: a deleted tenant never suppresses a different, still-serving tenant', async () => {
    propertyRows = [
      { property: 'sc-domain:deleted.com', domain: 'deleted.com', tenant_id: 't-del' },
      { property: 'sc-domain:active.com', domain: 'active.com', tenant_id: 't-active' },
    ]
    tenantRows = [
      { id: 't-del', status: 'deleted' },
      { id: 't-active', status: 'active' },
    ]

    const result = await runCompetitorScan()

    expect(result.properties).toBe(1)
  })
})
