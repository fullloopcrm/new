import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * stripe.accounts.create had no idempotencyKey. The route already guards
 * against a REPEAT click via the `stripe_account_id` DB check, but a
 * concurrent double-click can race past that read before either write lands,
 * so both requests call stripe.accounts.create and mint two orphan Connect
 * accounts for the same team member (only the last DB write wins, leaking
 * the other). The idempotencyKey closes that race at the Stripe layer.
 */

const TENANT_ID = 'tenant_1'
const TEAM_MEMBER_ID = 'tm_1'

const idempotencyStore = new Map<string, { id: string }>()
let realAccountCount = 0
const accountsCreate = vi.fn(async (_params: unknown, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey
  if (key && idempotencyStore.has(key)) return idempotencyStore.get(key)!
  realAccountCount++
  const account = { id: `acct_${realAccountCount}` }
  if (key) idempotencyStore.set(key, account)
  return account
})
const accountLinksCreate = vi.fn(async () => ({ url: 'https://connect.stripe.com/onboard' }))

vi.mock('stripe', () => {
  class MockStripe {
    accounts = { create: accountsCreate, retrieve: vi.fn(async () => ({})) }
    accountLinks = { create: accountLinksCreate }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError, getTenantForRequest: vi.fn(async () => ({ tenantId: TENANT_ID })) }
})

function teamMembersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    update: () => chain,
    single: async () => ({
      data: { id: TEAM_MEMBER_ID, name: 'Cleaner', email: 'cleaner@example.com', phone: null, stripe_account_id: null },
      error: null,
    }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => (table === 'team_members' ? teamMembersBuilder() : { select: () => ({}), eq: () => ({}) }) },
}))

import { POST } from './route'

beforeEach(() => {
  accountsCreate.mockClear()
  accountLinksCreate.mockClear()
  idempotencyStore.clear()
  realAccountCount = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
})

describe('team-members/[id]/stripe-onboard — concurrent double-click does not mint two Connect accounts', () => {
  it('passes a stable per-team-member idempotencyKey to stripe.accounts.create', async () => {
    const req = {} as unknown as Parameters<typeof POST>[0]
    const params = Promise.resolve({ id: TEAM_MEMBER_ID })

    const first = await POST(req, { params })
    const second = await POST(req, { params: Promise.resolve({ id: TEAM_MEMBER_ID }) })

    expect((await first.json()).account_id).toBeDefined()
    expect((await second.json()).account_id).toBeDefined()

    expect(accountsCreate).toHaveBeenCalledTimes(2)
    const [, opts1] = accountsCreate.mock.calls[0]
    const [, opts2] = accountsCreate.mock.calls[1]
    expect(opts1).toEqual({ idempotencyKey: `connect-account-${TENANT_ID}-${TEAM_MEMBER_ID}` })
    expect(opts2).toEqual({ idempotencyKey: `connect-account-${TENANT_ID}-${TEAM_MEMBER_ID}` })

    // Same key both times => Stripe would return the SAME account both times,
    // never a second real Connect account.
    expect(realAccountCount).toBe(1)
  })
})
