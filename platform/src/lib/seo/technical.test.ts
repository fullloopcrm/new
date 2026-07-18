import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * technical.ts's runTechnicalScan() — spends URL Inspection API quota (a
 * metered, ~2k/day/property Google budget) per property. Before this fix it
 * read seo_properties with zero tenant-status check, so a suspended/
 * cancelled/deleted tenant's site kept burning that quota (and writing
 * seo_issues) indefinitely. This test only exercises the property-selection
 * gate (result.properties) — listSitemaps() is mocked to fail immediately so
 * no property reaches the actual GSC inspection calls either way.
 */

type PropertyRow = { property: string; domain: string | null; tenant_id: string | null }
type TenantRow = { id: string; status: string | null }

let propertyRows: PropertyRow[]
let tenantRows: TenantRow[]

vi.mock('./gsc', () => ({
  listSitemaps: async () => {
    throw new Error('no sitemap in test')
  },
  inspectUrl: async () => ({}),
}))

vi.mock('../ssrf', () => ({
  safeFetch: async () => {
    throw new Error('not reached in test')
  },
}))

function builder(table: string) {
  const eq: Record<string, unknown> = {}
  const chain = {
    select: () => chain,
    delete: () => chain,
    eq: (col: string, val: unknown) => {
      eq[col] = val
      return chain
    },
    order: () => chain,
    limit: () => chain,
    neq: () => chain,
    gte: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'seo_properties') {
        resolve({ data: propertyRows.filter((r) => eq.enabled === undefined || true), error: null })
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
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { runTechnicalScan } from './technical'

beforeEach(() => {
  propertyRows = []
  tenantRows = []
})

describe('runTechnicalScan()', () => {
  it('scans a property linked to a still-serving tenant', async () => {
    propertyRows = [{ property: 'sc-domain:active.com', domain: 'active.com', tenant_id: 't-active' }]
    tenantRows = [{ id: 't-active', status: 'active' }]

    const result = await runTechnicalScan()

    expect(result.properties).toBe(1)
  })

  it('excludes a property linked to a suspended tenant (status-gate gap: was burning GSC quota indefinitely)', async () => {
    propertyRows = [{ property: 'sc-domain:suspended.com', domain: 'suspended.com', tenant_id: 't-susp' }]
    tenantRows = [{ id: 't-susp', status: 'suspended' }]

    const result = await runTechnicalScan()

    expect(result.properties).toBe(0)
  })

  it('excludes cancelled and deleted tenants, keeps active/setup/pending', async () => {
    propertyRows = [
      { property: 'sc-domain:cancelled.com', domain: 'cancelled.com', tenant_id: 't-cancel' },
      { property: 'sc-domain:deleted.com', domain: 'deleted.com', tenant_id: 't-del' },
      { property: 'sc-domain:setup.com', domain: 'setup.com', tenant_id: 't-setup' },
    ]
    tenantRows = [
      { id: 't-cancel', status: 'cancelled' },
      { id: 't-del', status: 'deleted' },
      { id: 't-setup', status: 'setup' },
    ]

    const result = await runTechnicalScan()

    expect(result.properties).toBe(1)
  })

  it('never excludes a property with tenant_id: null (unlinked/FL-owned)', async () => {
    propertyRows = [{ property: 'sc-domain:unlinked.com', domain: 'unlinked.com', tenant_id: null }]
    tenantRows = []

    const result = await runTechnicalScan()

    expect(result.properties).toBe(1)
  })

  it('wrong-tenant probe: a suspended tenant never suppresses a different, still-serving tenant', async () => {
    propertyRows = [
      { property: 'sc-domain:suspended.com', domain: 'suspended.com', tenant_id: 't-susp' },
      { property: 'sc-domain:active.com', domain: 'active.com', tenant_id: 't-active' },
    ]
    tenantRows = [
      { id: 't-susp', status: 'suspended' },
      { id: 't-active', status: 'active' },
    ]

    const result = await runTechnicalScan()

    expect(result.properties).toBe(1)
  })
})
