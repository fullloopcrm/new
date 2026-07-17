import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * onboarding.ts's backfillUntrackedDomains() — registers every active
 * tenant_domains host (plus, since the fallback fix, every legacy
 * tenants.domain host) that isn't yet a tracked seo_property. Mocks
 * supabaseAdmin against seo_properties, tenant_domains, and tenants,
 * mirroring backlinks.test.ts's inline chain-builder pattern.
 */

type TenantDomainRow = { domain: string; tenant_id: string; active: boolean }
type TenantRow = { id: string; domain: string | null }
type SeoPropertyRow = { property: string }

let seoPropertyRows: SeoPropertyRow[]
let tenantDomainRows: TenantDomainRow[]
let tenantRows: TenantRow[]
let upserted: Array<{ property: string; domain: string; tenant_id: string | null; meta: unknown }>

function builder(table: string) {
  const eq: Record<string, unknown> = {}
  let notNullCol: string | undefined

  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eq[col] = val; return chain },
    not: (col: string, _op: string, _val: unknown) => { notNullCol = col; return chain },
    upsert: (row: { property: string; domain: string; tenant_id: string | null; meta: unknown }) => {
      const alreadyTracked = seoPropertyRows.some((p) => p.property === row.property)
      if (!alreadyTracked) {
        upserted.push(row)
        seoPropertyRows.push({ property: row.property })
      }
      return {
        select: async () => ({ data: alreadyTracked ? [] : [{ property: row.property }], error: null }),
      }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'seo_properties') {
        resolve({ data: seoPropertyRows, error: null })
        return
      }
      if (table === 'tenant_domains') {
        resolve({ data: tenantDomainRows.filter((r) => (eq.active === undefined ? true : r.active === eq.active)), error: null })
        return
      }
      if (table === 'tenants') {
        if (notNullCol === 'domain') {
          resolve({ data: tenantRows.filter((t) => t.domain != null), error: null })
          return
        }
        resolve({ data: [], error: null })
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

import { backfillUntrackedDomains } from './onboarding'

beforeEach(() => {
  seoPropertyRows = []
  tenantDomainRows = []
  tenantRows = []
  upserted = []
})

describe('backfillUntrackedDomains()', () => {
  it('registers an untracked tenant_domains host', async () => {
    tenantDomainRows = [{ domain: 'acme.com', tenant_id: 't1', active: true }]

    const out = await backfillUntrackedDomains()

    expect(out.map((r) => r.domain)).toEqual(['acme.com'])
    expect(upserted[0].tenant_id).toBe('t1')
  })

  it('falls back to tenants.domain for a tenant with no active tenant_domains row (coverage gap regression)', async () => {
    // tenant_domains registration is best-effort (activate-tenant.ts's upsert
    // is try/catch, "never blocks" activation) -- a tenant live only via
    // legacy tenants.domain has zero tenant_domains rows. Before the fallback
    // fix, this tenant was never registered into seo_properties at all --
    // permanently untracked, not just unlinked.
    tenantDomainRows = []
    tenantRows = [{ id: 't2', domain: 'legacyco.com' }]

    const out = await backfillUntrackedDomains()

    expect(out.map((r) => r.domain)).toEqual(['legacyco.com'])
    expect(upserted[0].tenant_id).toBe('t2')
  })

  it('does not double-register a domain already covered by tenant_domains when it also appears in legacy tenants.domain (dedup, wrong-tenant probe)', async () => {
    // t3 owns 'shared-host.com' via tenant_domains; t9's legacy tenants.domain
    // row happens to share the same host string (a stale/pre-migration
    // duplicate). The legacy pass must not re-register the domain under t9.
    tenantDomainRows = [{ domain: 'shared-host.com', tenant_id: 't3', active: true }]
    tenantRows = [{ id: 't9', domain: 'shared-host.com' }]

    const out = await backfillUntrackedDomains()

    expect(out).toHaveLength(1)
    expect(upserted).toHaveLength(1)
    expect(upserted[0].tenant_id).toBe('t3')
  })

  it('skips a domain already tracked as a seo_property from either source', async () => {
    seoPropertyRows = [{ property: 'sc-domain:already-tracked.com' }]
    tenantDomainRows = [{ domain: 'already-tracked.com', tenant_id: 't1', active: true }]
    tenantRows = [{ id: 't2', domain: 'already-tracked.com' }]

    const out = await backfillUntrackedDomains()

    expect(out).toHaveLength(0)
    expect(upserted).toHaveLength(0)
  })

  it('registers both an inactive-tenant_domains-covered legacy host and an active tenant_domains host in the same run', async () => {
    tenantDomainRows = [{ domain: 'active-covered.com', tenant_id: 't1', active: true }]
    tenantRows = [{ id: 't2', domain: 'legacy-only.com' }]

    const out = await backfillUntrackedDomains()
    const domains = out.map((r) => r.domain).sort()

    expect(domains).toEqual(['active-covered.com', 'legacy-only.com'])
  })
})
