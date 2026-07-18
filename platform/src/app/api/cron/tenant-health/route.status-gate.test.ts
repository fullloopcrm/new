import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenant-health cron — status gate on both domain-discovery sources.
 *
 * BUG (fixed here): the cron's two sources filtered tenant status
 * inconsistently instead of sharing tenantServesSite() — the same gate
 * middleware, tenant.ts, and every other resolver caller use.
 *
 * Source 1 (tenant_domains) applied NO status filter at all. A tenant_domains
 * row is not deactivated when its tenant is suspended/cancelled/deleted, so
 * that tenant got health-checked anyway: middleware correctly darkens its
 * site (redirect to /sign-in), which the routing check reads as a mismatch
 * and FAILS — a false "site down" alert on a tenant behaving exactly as
 * designed.
 *
 * Source 2 (tenants.domain fallback) filtered with a hardcoded, wrong list —
 * `.in('status', ['active', 'live', 'setup'])`. 'live' isn't a real status
 * (KNOWN_TENANT_STATUSES has no such value); 'pending' — a real serving
 * status per tenantServesSite, since new tenants must be checkable before
 * full activation — was omitted. A pending tenant whose domain lived only in
 * tenants.domain silently dropped out of every run's coverage.
 *
 * FIX: both sources now gate on tenantServesSite(status), the platform's
 * single source of truth for "does this tenant serve its site."
 */

type Eqs = Record<string, unknown>
type Ins = Record<string, unknown[]>

let tenantDomainsRows: Array<{ tenant_id: string; domain: string; is_primary: boolean }>
let tenantsRows: Array<{ id: string; slug: string; domain: string | null; status: string }>
const checkedDomains: Array<{ slug: string; domain: string }> = []

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
    upsert: async () => ({ data: null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenant_domains') {
        const rows = tenantDomainsRows.filter(() => (eqs.active === undefined ? true : eqs.active === true))
        return resolve({ data: rows, error: null })
      }
      if (table === 'tenants') {
        let rows = tenantsRows
        if (ins.id) rows = rows.filter((t) => (ins.id as string[]).includes(t.id))
        if (nots.includes('domain')) rows = rows.filter((t) => t.domain !== null)
        // NOTE: no `ins.status` filtering here on purpose — the fixed route no
        // longer calls `.in('status', ...)` on either query, so a probe that
        // still exercised that filter would prove nothing.
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
})

describe('tenant-health cron — status gate shared across both sources', () => {
  it('source 1 (tenant_domains): skips a SUSPENDED tenant instead of health-checking (and false-alerting on) its darkened site', async () => {
    tenantDomainsRows = [{ tenant_id: 't-sus', domain: 'suspended.example.com', is_primary: true }]
    tenantsRows = [{ id: 't-sus', slug: 'suspendedco', domain: null, status: 'suspended' }]

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(checkedDomains).toEqual([])
  })

  it('source 1 (tenant_domains): skips a CANCELLED tenant', async () => {
    tenantDomainsRows = [{ tenant_id: 't-can', domain: 'cancelled.example.com', is_primary: true }]
    tenantsRows = [{ id: 't-can', slug: 'cancelledco', domain: null, status: 'cancelled' }]

    await GET(req())
    expect(checkedDomains).toEqual([])
  })

  it('source 1 (tenant_domains): still checks an ACTIVE tenant (no regression)', async () => {
    tenantDomainsRows = [{ tenant_id: 't-act', domain: 'active.example.com', is_primary: true }]
    tenantsRows = [{ id: 't-act', slug: 'activeco', domain: null, status: 'active' }]

    await GET(req())
    expect(checkedDomains).toEqual([{ slug: 'activeco', domain: 'active.example.com' }])
  })

  it('source 2 (tenants.domain fallback): checks a PENDING tenant, previously dropped by the hardcoded status list', async () => {
    tenantDomainsRows = []
    tenantsRows = [{ id: 't-pend', slug: 'pendingco', domain: 'pending.example.com', status: 'pending' }]

    await GET(req())
    expect(checkedDomains).toEqual([{ slug: 'pendingco', domain: 'pending.example.com' }])
  })

  it('source 2 (tenants.domain fallback): skips a DELETED tenant', async () => {
    tenantDomainsRows = []
    tenantsRows = [{ id: 't-del', slug: 'deletedco', domain: 'deleted.example.com', status: 'deleted' }]

    await GET(req())
    expect(checkedDomains).toEqual([])
  })
})
