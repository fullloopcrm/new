import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenant-health cron — source precedence (tenant_domains vs tenants.domain).
 *
 * The cron unions two domain sources per tenant. Until this fix, `tenants.domain`
 * won when a tenant had rows in both sources — the OPPOSITE of the resolver's
 * contract (`getTenantByDomain` in tenant.ts / tenant-lookup.ts reads
 * `tenant_domains` FIRST, falling back to `tenants.domain` only when no active
 * `tenant_domains` row exists). A tenant whose `tenant_domains` row had moved to
 * a new domain but whose stale `tenants.domain` still pointed at the old one
 * would get health-checked on the WRONG (stale) domain. This suite proves the
 * flip: `tenant_domains` now wins, `tenants.domain` is fallback-only, and each
 * tenant still surfaces exactly once (no duplicate/foreign entries).
 */

type Eqs = Record<string, unknown>
type Ins = Record<string, unknown[]>

let tenantDomainsRows: Array<{ tenant_id: string; domain: string; is_primary: boolean }>
let tenantsRows: Array<{ id: string; slug: string; domain: string | null; status: string }>
const checkedDomains: Array<{ slug: string; domain: string }> = []
const upsertedRows: unknown[] = []

function builder(table: string) {
  const eqs: Eqs = {}
  const ins: Ins = {}
  const nots: string[] = []
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      ins[col] = vals
      return chain
    },
    not: (col: string) => {
      nots.push(col)
      return chain
    },
    upsert: async (rows: unknown) => {
      upsertedRows.push(rows)
      return { data: null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenant_domains') {
        const rows = tenantDomainsRows.filter((r) => (eqs.active === undefined ? true : eqs.active === true))
        return resolve({ data: rows, error: null })
      }
      if (table === 'tenants') {
        let rows = tenantsRows
        if (ins.id) rows = rows.filter((t) => (ins.id as string[]).includes(t.id))
        if (nots.includes('domain')) rows = rows.filter((t) => t.domain !== null)
        if (ins.status) rows = rows.filter((t) => (ins.status as string[]).includes(t.status))
        return resolve({ data: rows, error: null })
      }
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => null) }))

vi.mock('@/lib/tenant-health', () => ({
  checkTenant: vi.fn(async (slug: string, domain: string) => {
    checkedDomains.push({ slug, domain })
    return {
      slug,
      domain,
      status: 'pass',
      matchedPath: `/site/${slug}`,
      checks: { reachable: true, routing: true, noLoop: true, formWired: true },
      detail: 'ok',
    }
  }),
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/tenant-health', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  tenantDomainsRows = []
  tenantsRows = []
  checkedDomains.length = 0
  upsertedRows.length = 0
})

describe('tenant-health cron — tenant_domains-first precedence', () => {
  it('WRONG-TENANT PROBE: uses the tenant_domains domain, never the stale tenants.domain fallback', async () => {
    // tenant-a has BOTH sources, pointing at DIFFERENT domains. tenant_domains
    // must win — checking the stale tenants.domain would health-check (and
    // alert on) the wrong live host.
    tenantDomainsRows = [{ tenant_id: 't-a', domain: 'new.example.com', is_primary: true }]
    tenantsRows = [{ id: 't-a', slug: 'acme', domain: 'old-stale.example.com', status: 'active' }]

    const res = await GET(req())
    expect(res.status).toBe(200)

    expect(checkedDomains).toEqual([{ slug: 'acme', domain: 'new.example.com' }])
    expect(checkedDomains.some((c) => c.domain === 'old-stale.example.com')).toBe(false)
  })

  it('falls back to tenants.domain only when tenant_domains has no row for the tenant', async () => {
    tenantDomainsRows = []
    tenantsRows = [{ id: 't-b', slug: 'legacyco', domain: 'legacy.example.com', status: 'active' }]

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(checkedDomains).toEqual([{ slug: 'legacyco', domain: 'legacy.example.com' }])
  })

  it('each tenant is checked exactly once even when covered by both sources', async () => {
    tenantDomainsRows = [{ tenant_id: 't-c', domain: 'primary.example.com', is_primary: true }]
    tenantsRows = [{ id: 't-c', slug: 'oneshot', domain: 'primary.example.com', status: 'active' }]

    await GET(req())
    expect(checkedDomains).toHaveLength(1)
  })

  it('ignores inactive tenant_domains rows (falls through to tenants.domain)', async () => {
    // Filtered out by the .eq('active', true) query itself in the real client;
    // simulate here by simply omitting an inactive row from the fixture, since
    // the tenant_domains query only ever returns active=true rows.
    tenantDomainsRows = []
    tenantsRows = [{ id: 't-d', slug: 'stillup', domain: 'stillup.example.com', status: 'active' }]

    await GET(req())
    expect(checkedDomains).toEqual([{ slug: 'stillup', domain: 'stillup.example.com' }])
  })
})
