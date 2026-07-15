import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * WITNESS — unauthenticated cross-tenant Stripe Connect status disclosure.
 *
 * GET/POST /api/team-members/[id]/stripe-status previously resolved its tenant
 * via `resolveTenantForTeamMember()`, which fell back to looking up whichever
 * tenant owns the supplied `team_member_id` directly from the DB with ZERO
 * session or domain check when the request had no host-derived tenant header
 * (the normal case for a direct API call). The route's only real caller
 * (`/stripe-onboard/complete`) is itself unauthenticated and was never wired
 * to any Stripe return_url in this codebase — so any caller who knew/guessed
 * a team_member UUID (from ANY tenant) could pull that member's Stripe
 * Connect account status (charges_enabled/payouts_enabled/details_submitted)
 * with no auth at all. Fixed by requiring `getTenantForRequest()` (session +
 * tenant membership), matching the sibling stripe-onboard route's GET.
 */

const h = vi.hoisted(() => ({
  authThrows: false,
  tenantId: 'tenant-A',
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

type State = {
  table: string
  op: 'select' | 'update'
  eqs: Record<string, unknown>
  payload: unknown
}

function runQuery(state: State, terminal: 'single' | 'many') {
  const rows = h.store[state.table] || (h.store[state.table] = [])
  const match = (r: Record<string, unknown>) =>
    Object.entries(state.eqs).every(([k, v]) => r[k] === v)

  if (state.op === 'update') {
    for (const r of rows) if (match(r)) Object.assign(r, state.payload as object)
    return { data: null, error: null }
  }

  const found = rows.filter(match)
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  return { data: found, error: null }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, payload: null }
      const chain: Record<string, unknown> = {
        select: () => chain,
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        single: () => Promise.resolve(runQuery(state, 'single')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(state, 'many')).then(res, rej),
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient() }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('stripe', () => ({
  default: class {
    accounts = {
      retrieve: async (accountId: string) => ({
        id: accountId,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        capabilities: { transfers: 'active' },
      }),
    }
  },
}))
const { FakeAuthError } = vi.hoisted(() => ({
  FakeAuthError: class FakeAuthError extends Error {
    status = 401
  },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => {
    if (h.authThrows) throw new FakeAuthError('Unauthorized')
    return { tenantId: h.tenantId, tenant: { id: h.tenantId, stripe_api_key: null }, role: 'owner' }
  },
  AuthError: FakeAuthError,
}))

process.env.STRIPE_SECRET_KEY = 'sk_test_env'

import { GET, POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const MEMBER_B = 'member-b'

function req(method: 'GET' | 'POST') {
  return new Request(`http://x/api/team-members/${MEMBER_B}/stripe-status`, { method })
}

function ctx() {
  return { params: Promise.resolve({ id: MEMBER_B }) }
}

beforeEach(() => {
  h.authThrows = false
  h.tenantId = TENANT_A
  h.store = {
    team_members: [
      { id: MEMBER_B, tenant_id: TENANT_B, name: 'Bob', stripe_account_id: 'acct_bob', stripe_ready_at: null },
    ],
  }
})

describe('GET/POST /api/team-members/[id]/stripe-status — auth gate', () => {
  it('rejects an unauthenticated caller instead of leaking Stripe account status', async () => {
    h.authThrows = true
    const getRes = await GET(req('GET') as never, ctx())
    expect(getRes.status).toBe(401)
    const postRes = await POST(req('POST') as never, ctx())
    expect(postRes.status).toBe(401)
  })

  it("does not leak another tenant's team member Stripe status to an authenticated-but-wrong-tenant caller", async () => {
    h.authThrows = false
    h.tenantId = TENANT_A // caller belongs to tenant A; target member belongs to tenant B
    const getRes = await GET(req('GET') as never, ctx())
    const body = await getRes.json()
    expect(body).toEqual({ ready: false })
    expect(body.charges_enabled).toBeUndefined()
  })

  it('positive control: an authenticated caller in the SAME tenant as the team member gets real status', async () => {
    h.authThrows = false
    h.tenantId = TENANT_B
    const getRes = await GET(req('GET') as never, ctx())
    const body = await getRes.json()
    expect(body.ready).toBe(true)
    expect(body.charges_enabled).toBe(true)
  })
})
