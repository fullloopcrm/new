import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenant-health cron — masked DB error on the tenants.domain fallback query.
 *
 * BUG (fixed here): the fallback query (`tenants.domain`, source 2 of the
 * union) discarded its `error` entirely — only `data` was destructured. A
 * real query failure there surfaced as `data: null`, which the route folded
 * into `tenantRows ?? []`, silently identical to "no fallback-only tenants
 * exist" (the genuine, expected case for a fully-tenant_domains-migrated
 * fleet). Every tenant relying solely on `tenants.domain` (not yet migrated
 * to tenant_domains) would drop out of that run's coverage with no error
 * and no alert — the cron would report "0 failures, N checked" for a run
 * that actually checked FEWER tenants than it should have. This is the
 * exact silent-darkening failure mode the fortress cron exists to catch,
 * reached through its own target-discovery query instead of a tenant's site.
 *
 * FIX: check `tenantRowsErr` explicitly, same as source 1 (tenant_domains)
 * just above it — alert + fail loud (500) instead of silently narrowing
 * coverage.
 */

type Eqs = Record<string, unknown>
type Ins = Record<string, unknown[]>

let tenantDomainsRows: Array<{ tenant_id: string; domain: string; is_primary: boolean }>
let tenantsRows: Array<{ id: string; slug: string; domain: string | null; status: string }>
let tenantsQueryError: { message: string } | null
const checkedDomains: Array<{ slug: string; domain: string }> = []
const alertCalls: Array<{ title: string; body: string }> = []

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
      void rows
      return { data: null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenant_domains') {
        const rows = tenantDomainsRows.filter((r) => (eqs.active === undefined ? true : eqs.active === true))
        return resolve({ data: rows, error: null })
      }
      if (table === 'tenants') {
        // Only the fallback query (filtered by `not domain is null` + status
        // `in`) is the one this bug affects — the tenant_domains-tenants
        // lookup (`in('id', ...)`) is a different call on the same table.
        if (nots.includes('domain') && tenantsQueryError) {
          return resolve({ data: null, error: tenantsQueryError })
        }
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

vi.mock('@/lib/telegram', () => ({
  alertOwner: vi.fn(async (title: string, body: string) => {
    alertCalls.push({ title, body })
    return null
  }),
}))

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
  tenantsQueryError = null
  checkedDomains.length = 0
  alertCalls.length = 0
})

describe('tenant-health cron — masked DB error on tenants.domain fallback query', () => {
  it('MASKED-ERROR PROBE: a real query failure on the fallback aborts loud instead of silently checking zero fallback tenants', async () => {
    tenantDomainsRows = []
    tenantsRows = [{ id: 't-e', slug: 'fallbackonly', domain: 'fallbackonly.example.com', status: 'active' }]
    tenantsQueryError = { message: 'upstream connect error' }

    const res = await GET(req())
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/upstream connect error/)
    // The tenant that would only ever be found via this fallback query must
    // NOT silently disappear from coverage with a clean 200 — it never gets
    // health-checked once the query that discovers it fails.
    expect(checkedDomains).toEqual([])
    expect(alertCalls.length).toBeGreaterThan(0)
  })

  it('no regression: a clean fallback query still checks the tenant normally', async () => {
    tenantDomainsRows = []
    tenantsRows = [{ id: 't-f', slug: 'legacyco', domain: 'legacy.example.com', status: 'active' }]
    tenantsQueryError = null

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(checkedDomains).toEqual([{ slug: 'legacyco', domain: 'legacy.example.com' }])
  })
})
