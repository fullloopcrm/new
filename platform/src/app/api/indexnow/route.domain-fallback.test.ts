import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/indexnow — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): the submission handler read `tenant.domain` directly off
 * the `tenants` row to build the IndexNow `host`/`keyLocation`, never
 * consulting `tenant_domains`. A tenant whose real custom domain lives only
 * in tenant_domains (the normal state — admin/websites writes tenant_domains
 * only, never tenants.domain) had its IndexNow pings submitted for the wrong
 * host, and the `keyLocation` ownership-verification URL pointed at a host
 * that would never resolve back through this same route's GET handler
 * (which resolves the tenant from the request host). Fixed by resolving
 * through getPrimaryTenantDomain() first, tenants.domain as fallback — same
 * precedence as tenantSiteUrl()/resolveOrigin()'s other callers.
 */

const TENANT_A = 'tid-indexnow-a'
const TENANT_B = 'tid-indexnow-b'

let tenantsRows: Record<string, unknown>[] = []
let tenantDomainsRows: Record<string, unknown>[] = []

const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 200 }))
vi.stubGlobal('fetch', fetchMock)

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
      single: () => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        return Promise.resolve({ data: hit[0] || null, error: null })
      },
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
      if (table === 'tenants') return makeTable(() => tenantsRows)()
      if (table === 'tenant_domains') return makeTable(() => tenantDomainsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { POST } from './route'

function req(tenantId: string) {
  return new Request('http://t/api/indexnow', {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret', 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId, urls: ['https://example.com/page'] }),
  }) as unknown as import('next/server').NextRequest
}

function submittedHost(): string {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
  const init = call?.[1] as RequestInit | undefined
  const parsed = init?.body ? JSON.parse(init.body as string) : {}
  return parsed.host || ''
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  fetchMock.mockClear()
  tenantDomainsRows = []

  tenantsRows = [
    { id: TENANT_A, domain: null, selena_config: { indexnow_key: 'key-a' } },
  ]
})

describe('POST /api/indexnow — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — submits that host, not tenants.domain', async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await POST(req(TENANT_A))
    expect(res.status).toBe(200)
    expect(submittedHost()).toBe('custom.example.com')
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    tenantsRows = [{ id: TENANT_A, domain: 'legacy.example.com', selena_config: { indexnow_key: 'key-a' } }]
    const res = await POST(req(TENANT_A))
    expect(res.status).toBe(200)
    expect(submittedHost()).toBe('legacy.example.com')
  })

  it('errors when neither tenant_domains nor tenants.domain resolve', async () => {
    const res = await POST(req(TENANT_A))
    expect(res.status).toBe(400)
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's submission", async () => {
    tenantsRows.push({ id: TENANT_B, domain: null, selena_config: { indexnow_key: 'key-b' } })
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: TENANT_B, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const resA = await POST(req(TENANT_A))
    expect(submittedHost()).toBe('a-real.example.com')
    const resB = await POST(req(TENANT_B))
    expect(submittedHost()).toBe('b-real.example.com')
    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)
  })
})
