import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression for a real live-account failure (leader, 2026-07-22 16:20):
 * requesting `transfers` alone on account creation is rejected by Stripe on
 * this platform ("needs approval for transfers without card_payments").
 * Confirmed workaround: request `card_payments` alongside `transfers` —
 * card_payments sits unused/unverified since cleaners never take card
 * payments directly, but the dual-capability request avoids the platform
 * restriction entirely.
 */

const TENANT_ID = 'tenant_1'
const TEAM_MEMBER_ID = 'tm_1'

const accountsCreate = vi.fn(async (params: unknown) => {
  void params
  return { id: 'acct_1' }
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

function tenantsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { stripe_api_key: null }, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'team_members') return teamMembersBuilder()
      if (table === 'tenants') return tenantsBuilder()
      return { select: () => ({}), eq: () => ({}) }
    },
  },
}))

import { POST } from './route'

beforeEach(() => {
  accountsCreate.mockClear()
  accountLinksCreate.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
})

describe('team-members/[id]/stripe-onboard — account creation requests both capabilities', () => {
  it('requests transfers AND card_payments together, never transfers alone', async () => {
    const req = {} as unknown as Parameters<typeof POST>[0]
    const params = Promise.resolve({ id: TEAM_MEMBER_ID })

    const res = await POST(req, { params })
    expect(res.status).toBe(200)

    expect(accountsCreate).toHaveBeenCalledTimes(1)
    const [createParams] = accountsCreate.mock.calls[0] as [{ capabilities?: Record<string, { requested: boolean }> }]
    expect(createParams.capabilities).toEqual({
      transfers: { requested: true },
      card_payments: { requested: true },
    })
  })
})
