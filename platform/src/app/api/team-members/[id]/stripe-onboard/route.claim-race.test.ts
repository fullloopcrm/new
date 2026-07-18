import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Two concurrent POSTs (double-click, retry) with stripe_account_id still
 * null both used to call stripe.accounts.create() and then unconditionally
 * overwrite team_members.stripe_account_id -- last write wins with no signal
 * to the loser, so the team member could complete onboarding on the account
 * that gets discarded while payouts (read team_members.stripe_account_id)
 * target the other, never-onboarded account and fail. The fix claims the
 * write atomically on IS NULL and falls back to whatever account actually won
 * the race.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let acctCounter = 0
// When true, simulates a concurrent request winning the DB claim while ours
// is still awaiting Stripe's accounts.create() round-trip.
let injectRaceLoss = false

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let updatePayload: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    is: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    update: (payload: Row) => { updatePayload = payload; return c },
    single: async () => {
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      return { data: row ?? null, error: row ? null : { message: 'not found' } }
    },
    maybeSingle: async () => {
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      if (row && updatePayload) Object.assign(row, updatePayload)
      return { data: row ?? null, error: null }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A, role: 'owner', tenant: {} }, error: null }),
}))
vi.mock('stripe', () => {
  class MockStripe {
    accounts = {
      create: async () => {
        const id = `acct_new_${++acctCounter}`
        if (injectRaceLoss) {
          // A competing request finished its own create+claim while we were
          // still awaiting this call, and already wrote its winning account
          // id to the row.
          DB.team_members[0].stripe_account_id = 'acct_winner'
        }
        return { id }
      },
    }
    accountLinks = {
      create: async ({ account }: { account: string }) => ({ url: `https://connect.stripe.com/setup/${account}` }),
    }
  }
  return { default: MockStripe }
})

import { POST } from './route'

beforeEach(() => {
  acctCounter = 0
  injectRaceLoss = false
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  DB.team_members = [{ id: 'tm-1', tenant_id: TENANT_A, email: 'tm@example.com', stripe_account_id: null }]
})

const postReq = () => new Request('http://x/api/team-members/tm-1/stripe-onboard', { method: 'POST' }) as unknown as import('next/server').NextRequest
const ctx = { params: Promise.resolve({ id: 'tm-1' }) }

describe('POST /api/team-members/[id]/stripe-onboard — concurrent-claim race', () => {
  it('the first request to run claims the account it created', async () => {
    const res = await POST(postReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.account_id).toBe('acct_new_1')
    expect(DB.team_members[0].stripe_account_id).toBe('acct_new_1')
  })

  it('a request that loses the claim race uses the winner account, not its own orphan', async () => {
    injectRaceLoss = true

    const res = await POST(postReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()

    // Must NOT return the account this call itself just created (acct_new_1)
    // -- that would be the orphan the old unconditional-overwrite bug allowed.
    expect(body.account_id).toBe('acct_winner')
    expect(DB.team_members[0].stripe_account_id).toBe('acct_winner')
  })
})
