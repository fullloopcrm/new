import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/tenant/public — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): the response's `domain` field was built from
 * `tenant.domain` directly, the legacy column only, never consulting
 * `tenant_domains`. This field feeds dashboard/users' team-login-link UI
 * (`if (t.domain) setLoginUrl(...)`) — a tenant whose real custom domain
 * lives only in tenant_domains (the normal state — admin/websites writes
 * tenant_domains only, never tenants.domain) got `domain: null` back and the
 * login link silently never rendered, no error surfaced. Fixed by resolving
 * through getPrimaryTenantDomain() first, tenants.domain as fallback — same
 * precedence as tenantSiteUrl()/resolveOrigin()'s other callers.
 */

const TENANT_A = 'tid-public-a'
const TENANT_B = 'tid-public-b'

let tenantDomainsRows: Record<string, unknown>[] = []
let currentTenant: Record<string, unknown> | null = null

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

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => currentTenant),
}))

import { GET } from './route'

beforeEach(() => {
  tenantDomainsRows = []
  currentTenant = { id: TENANT_A, name: 'Tenant A', domain: null }
})

describe('GET /api/tenant/public — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — returns that host', async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await GET()
    const body = await res.json()
    expect(body.domain).toBe('custom.example.com')
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    currentTenant = { id: TENANT_A, name: 'Tenant A', domain: 'legacy.example.com' }
    const res = await GET()
    const body = await res.json()
    expect(body.domain).toBe('legacy.example.com')
  })

  it('returns null when neither tenant_domains nor tenants.domain resolve (previously also null, but now via the same resolver path)', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.domain).toBeNull()
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's response", async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: TENANT_B, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]

    currentTenant = { id: TENANT_A, name: 'Tenant A', domain: null }
    const resA = await GET()
    const bodyA = await resA.json()
    expect(bodyA.domain).toBe('a-real.example.com')

    currentTenant = { id: TENANT_B, name: 'Tenant B', domain: null }
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.domain).toBe('b-real.example.com')
  })
})
