import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * runAllChecks() (lib/onboarding-verify.ts) — resolver-precedence
 * bug-class probe.
 *
 * BUG (fixed here): the DNS/SSL verification batch (used by
 * /api/admin/businesses/[id]/verify-checklist, which persists results into
 * tenants.dns_configured + setup_progress) resolved its target domain from
 * tenant.domain directly, the legacy column only, never consulting
 * tenant_domains. A tenant whose real custom domain lives only in
 * tenant_domains (the normal state — admin/websites writes tenant_domains
 * only, never tenants.domain) got every DNS/SSL check run against an empty
 * string, always failing, silently persisting dns_configured=false on every
 * verify run even though the tenant's real custom domain was live and
 * correctly registered. Fixed by resolving through getPrimaryTenantDomain()
 * first, tenants.domain as fallback.
 */

const A = 'tid-verify-a'
const B = 'tid-verify-b'

let tenantDomainsRows: Record<string, unknown>[] = []

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let orderCol: string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      order: (col: string) => { orderCol = col; return chain },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (orderCol) hit = [...hit].sort((a, b) => String(a[orderCol as string]).localeCompare(String(b[orderCol as string])))
        resolve({ data: hit, error: null })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenant_domains') return makeTable(() => tenantDomainsRows)()
      return makeTable(() => [])()
    },
  },
}))

const resolve4Mock = vi.hoisted(() => vi.fn(async (domain: string) => {
  if (!domain) throw new Error('empty host')
  return ['76.76.21.21']
}))
vi.mock('dns', () => {
  const promises = {
    resolve4: (domain: string) => resolve4Mock(domain),
    resolveCname: async () => { throw new Error('not mocked') },
    resolveMx: async () => { throw new Error('not mocked') },
  }
  return { promises, default: { promises } }
})

// Avoid a real network call from verifySsl in every case that resolves a domain.
vi.mock('./ssrf', () => ({
  safeFetch: vi.fn(async () => new Response(null, { status: 200 })),
}))

import { runAllChecks, type TenantForVerify } from './onboarding-verify'

function tenant(overrides: Partial<TenantForVerify>): TenantForVerify {
  return { id: A, domain: null, ...overrides }
}

beforeEach(() => {
  tenantDomainsRows = []
  resolve4Mock.mockClear()
})

describe('runAllChecks — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — DNS check runs against that host', async () => {
    tenantDomainsRows = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const checks = await runAllChecks(tenant({}), 'https://app.example.com')
    expect(resolve4Mock).toHaveBeenCalledWith('custom.example.com')
    expect(checks.dns_a.detail).not.toBe('No domain set')
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    const checks = await runAllChecks(tenant({ domain: 'legacy.example.com' }), 'https://app.example.com')
    expect(resolve4Mock).toHaveBeenCalledWith('legacy.example.com')
    expect(checks.dns_a.detail).not.toBe('No domain set')
  })

  it('reports "No domain set" (previous behavior preserved) when neither tenant_domains nor tenants.domain resolve', async () => {
    const checks = await runAllChecks(tenant({}), 'https://app.example.com')
    expect(resolve4Mock).not.toHaveBeenCalled()
    expect(checks.dns_a.ok).toBe(false)
    expect(checks.dns_a.detail).toBe('No domain set')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's DNS check", async () => {
    tenantDomainsRows = [
      { tenant_id: A, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: B, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    await runAllChecks(tenant({ id: A }), 'https://app.example.com')
    expect(resolve4Mock).toHaveBeenCalledWith('a-real.example.com')
    resolve4Mock.mockClear()
    await runAllChecks(tenant({ id: B }), 'https://app.example.com')
    expect(resolve4Mock).toHaveBeenCalledWith('b-real.example.com')
  })
})
