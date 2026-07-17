import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getStripe() previously ignored the tenant's own configured Stripe key
 * entirely and always used process.env.STRIPE_SECRET_KEY -- unlike its own
 * sibling stripe-status.ts (and payment-processor.ts's real transfer path),
 * which both use tenant.stripe_api_key first, falling back to env. For a
 * tenant with their own Stripe account configured, that meant the team
 * member's Connect Express account got created under the PLATFORM's Stripe
 * account while every later status check / real payout transfer looked it
 * up under the TENANT's own account -- a resource that doesn't exist there,
 * so status checks 500 and payment-processor.ts's transfer silently fails
 * and just logs, forever, for that tenant. Fixed by threading
 * tenant.stripe_api_key through getStripe() the same way stripe-status.ts
 * already does.
 */

const h = vi.hoisted(() => ({
  store: {} as Record<string, Array<Record<string, unknown>>>,
  tenantStripeKey: null as string | null,
}))

type State = { table: string; op: 'select' | 'update'; eqs: Record<string, unknown>; payload: unknown }

function runQuery(state: State) {
  const rows = h.store[state.table] || (h.store[state.table] = [])
  const match = (r: Record<string, unknown>) => Object.entries(state.eqs).every(([k, v]) => r[k] === v)
  if (state.op === 'update') {
    for (const r of rows) if (match(r)) Object.assign(r, state.payload as object)
    return { data: null, error: null }
  }
  const found = rows.filter(match)
  return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, payload: null }
      const chain: Record<string, unknown> = {
        select: () => chain,
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        single: () => Promise.resolve(runQuery(state)),
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient() }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => `dec:${s}` }))

const stripeConstructorKeys: string[] = []
vi.mock('stripe', () => ({
  default: class {
    constructor(key: string) {
      stripeConstructorKeys.push(key)
    }
    accounts = {
      create: async () => ({ id: 'acct_new' }),
      retrieve: async (accountId: string) => ({
        id: accountId,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),
    }
    accountLinks = {
      create: async () => ({ url: 'https://connect.stripe.com/setup/x' }),
    }
  },
}))

vi.mock('@/lib/tenant-query', () => ({
  AuthError: class FakeAuthError extends Error { status = 401 },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    error: null,
    tenant: {
      tenantId: 'tenant-A',
      role: 'owner',
      tenant: { id: 'tenant-A', stripe_api_key: h.tenantStripeKey },
    },
  }),
}))

process.env.STRIPE_SECRET_KEY = 'sk_test_env'

import { GET, POST } from './route'

const MEMBER_A = 'member-a'

function ctx() {
  return { params: Promise.resolve({ id: MEMBER_A }) }
}

beforeEach(() => {
  stripeConstructorKeys.length = 0
  h.tenantStripeKey = null
  h.store = {
    team_members: [{ id: MEMBER_A, tenant_id: 'tenant-A', name: 'Alice', email: 'a@x.com', stripe_account_id: null }],
  }
})

describe('team-members/[id]/stripe-onboard — tenant-key-first Stripe client', () => {
  it('POST falls back to the platform env key when the tenant has none configured', async () => {
    const res = await POST({} as never, ctx())
    expect(res.status).toBe(200)
    expect(stripeConstructorKeys).toEqual(['sk_test_env'])
  })

  it("POST uses the TENANT's own configured (decrypted) key when present, not the platform env key", async () => {
    h.tenantStripeKey = 'enc-tenant-key'
    const res = await POST({} as never, ctx())
    expect(res.status).toBe(200)
    expect(stripeConstructorKeys).toEqual(['dec:enc-tenant-key'])
  })

  it("GET (status check on an already-connected account) uses the SAME tenant key convention as POST", async () => {
    h.store.team_members[0].stripe_account_id = 'acct_existing'
    h.tenantStripeKey = 'enc-tenant-key'
    const res = await GET({} as never, ctx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.connected).toBe(true)
    expect(stripeConstructorKeys).toEqual(['dec:enc-tenant-key'])
  })
})
