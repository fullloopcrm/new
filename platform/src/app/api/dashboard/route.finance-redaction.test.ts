import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/dashboard previously returned `financials` (today/week/month/
 * pending revenue) and `stats.pending_payment` to ANY authenticated tenant
 * member with zero permission check — `staff`, which explicitly lacks
 * finance.view per rbac.ts, could pull full revenue figures through this
 * endpoint even though a dedicated finance.view permission exists exactly
 * to keep that data from them. Fix redacts financials/pending_payment for
 * roles without finance.view instead of gating the whole aggregator (staff
 * still needs todayJobs/mapJobs/clients/teamMembers from this same route).
 */

let mockRole = 'staff'

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'user-1',
    tenantId: 'tenant-1',
    tenant: { id: 'tenant-1', selena_config: {} },
    role: mockRole,
  })),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

// Generic chainable query builder — every method returns itself; awaiting
// resolves to an empty-but-valid Postgrest response. Values themselves are
// irrelevant to this test; only whether `financials`/`pending_payment` are
// present in the response shape is under test.
function chain(): unknown {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) =>
          resolve({ data: [], count: 0, error: null })
      }
      return () => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn(() => chain()) },
}))

describe('GET /api/dashboard — finance.view redaction', () => {
  it('redacts financials + pending_payment for a role without finance.view (staff)', async () => {
    mockRole = 'staff'
    vi.resetModules()
    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.financials).toBeNull()
    expect(body.stats.pending_payment).toBeNull()
    // Non-financial widgets remain available to staff.
    expect(body.todayJobs).toBeDefined()
    expect(body.teamMembers).toBeDefined()
  })

  it('includes financials + pending_payment for a role with finance.view (admin)', async () => {
    mockRole = 'admin'
    vi.resetModules()
    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.financials).not.toBeNull()
    expect(body.financials.today).toBeDefined()
    expect(body.stats.pending_payment).not.toBeNull()
  })
})
