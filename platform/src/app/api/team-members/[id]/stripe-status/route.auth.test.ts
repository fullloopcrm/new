import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Auth gate probe — team-members/[id]/stripe-status/route.ts.
 * Both GET and POST used to resolve tenant via a header-or-DB fallback
 * (getTenantFromHeaders(), then a raw team_members-by-id lookup with zero
 * session check) instead of requiring an authenticated tenant session. Any
 * caller who knew/guessed a team_member UUID from ANY tenant could pull that
 * member's Stripe Connect account status (charges_enabled/payouts_enabled/
 * details_submitted) fully unauthenticated, cross-tenant. Fixed by requiring
 * getTenantForRequest(), matching the sibling stripe-onboard route's own GET,
 * and scoping the team_members lookup to the caller's own tenant_id (so a
 * foreign-tenant id 404s instead of leaking).
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let updatePatch: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    update: (patch: Row) => {
      updatePatch = patch
      return chain
    },
    single: async () => {
      const row = (store[table] || []).find((r) => matches(r, eqs)) || null
      return { data: row, error: row ? null : { message: 'not found' } }
    },
    then: (resolve: (v: { data: null; error: null }) => unknown) => {
      if (updatePatch) {
        store[table] = (store[table] || []).map((r) =>
          matches(r, eqs) ? { ...r, ...updatePatch } : r,
        )
      }
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

let currentTenant: string | null

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: async () => {
      if (!currentTenant) throw new AuthError('Unauthorized')
      return { tenantId: currentTenant, role: 'owner' }
    },
  }
})

const retrieveMock = vi.fn(async (accountId: string) => ({
  id: accountId,
  charges_enabled: true,
  payouts_enabled: true,
  details_submitted: true,
  capabilities: { transfers: 'active' },
}))

vi.mock('stripe', () => {
  class FakeStripe {
    accounts = { retrieve: retrieveMock }
  }
  return { default: FakeStripe }
})

process.env.STRIPE_SECRET_KEY = 'sk_test_x'

import { GET, POST } from './route'

function req() {
  return new Request('http://x') as unknown as Parameters<typeof GET>[0]
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  store = {
    tenants: [
      { id: 'tenant-A', stripe_api_key: null },
      { id: 'tenant-B', stripe_api_key: null },
    ],
    team_members: [
      { id: 'tm-a', tenant_id: 'tenant-A', name: 'Alex', stripe_account_id: 'acct_a', stripe_ready_at: null },
    ],
  }
  currentTenant = 'tenant-A'
  retrieveMock.mockClear()
})

describe('stripe-status GET/POST — auth gate', () => {
  it('an authenticated caller in the owning tenant sees the status (positive control)', async () => {
    const res = await GET(req(), ctx('tm-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ready).toBe(true)
    expect(body.charges_enabled).toBe(true)
  })

  it('an unauthenticated caller is rejected and never reaches Stripe', async () => {
    currentTenant = null
    const res = await GET(req(), ctx('tm-a'))
    expect(res.status).toBe(401)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('a caller authenticated into a DIFFERENT tenant cannot pull a foreign team member\'s Stripe status (cross-tenant probe)', async () => {
    currentTenant = 'tenant-B'
    const res = await GET(req(), ctx('tm-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ready).toBe(false)
    expect(body.charges_enabled).toBeUndefined()
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('POST is likewise gated: unauthenticated caller is rejected', async () => {
    currentTenant = null
    const res = await POST(req() as never, ctx('tm-a'))
    expect(res.status).toBe(401)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('POST cross-tenant probe: foreign tenant caller gets a no-op, not the team member\'s Stripe data', async () => {
    currentTenant = 'tenant-B'
    const res = await POST(req() as never, ctx('tm-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ready).toBe(false)
    expect(body.charges_enabled).toBeUndefined()
    expect(retrieveMock).not.toHaveBeenCalled()
  })
})
