import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression for a real cross-tenant bug (found by W4, confirmed by leader,
 * 2026-07-22 CHANNEL.md): POST created the Connect account via
 * `new Stripe(process.env.STRIPE_SECRET_KEY)` — the shared platform key —
 * never reading tenants.stripe_api_key. Under the confirmed per-tenant-Stripe-
 * account architecture, a tenant with its own stripe_api_key (e.g.
 * we-pay-you-junk) would mint the Connect account under the PLATFORM's
 * account, then stripe-status's later `stripe.accounts.retrieve()` under
 * the TENANT's own key would 404 with "No such account" — onboarding
 * completes for the team member but the app never learns it.
 *
 * This proves both POST (account create) and GET (status check) now pass
 * the tenant's own key into getStripe(), same pattern as
 * sales-partners/[id]/stripe-onboard/route.ts.
 */

const TENANT_ID = 'tenant_1'
const TEAM_MEMBER_ID = 'tm_1'

const stripeConstructorKeys: (string | undefined)[] = []
const accountsCreate = vi.fn(async () => ({ id: 'acct_1' }))
const accountsRetrieve = vi.fn(async () => ({ id: 'acct_1', charges_enabled: true, payouts_enabled: true, details_submitted: true }))
const accountLinksCreate = vi.fn(async () => ({ url: 'https://connect.stripe.com/onboard' }))

vi.mock('stripe', () => {
  class MockStripe {
    accounts = { create: accountsCreate, retrieve: accountsRetrieve }
    accountLinks = { create: accountLinksCreate }
    static LatestApiVersion = '2025-04-30.basil'
    constructor(apiKey: string) {
      stripeConstructorKeys.push(apiKey)
    }
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

let tenantStripeApiKey: string | null = 'sk_test_tenant_own_key'

function teamMembersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    update: () => chain,
    single: async () => ({
      data: { id: TEAM_MEMBER_ID, name: 'Cleaner', email: 'cleaner@example.com', phone: null, stripe_account_id: 'acct_1' },
      error: null,
    }),
  }
  return chain
}

function tenantsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { stripe_api_key: tenantStripeApiKey }, error: null }),
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

import { POST, GET } from './route'

beforeEach(() => {
  accountsCreate.mockClear()
  accountsRetrieve.mockClear()
  accountLinksCreate.mockClear()
  stripeConstructorKeys.length = 0
  tenantStripeApiKey = 'sk_test_tenant_own_key'
  process.env.STRIPE_SECRET_KEY = 'sk_test_platform_fallback'
})

describe('team-members/[id]/stripe-onboard — tenant owns its own Stripe account', () => {
  it('POST creates the Connect account under the tenant\'s own key, not the platform fallback', async () => {
    const req = {} as unknown as Parameters<typeof POST>[0]
    const params = Promise.resolve({ id: TEAM_MEMBER_ID })

    const res = await POST(req, { params })
    expect(res.status).toBe(200)

    expect(stripeConstructorKeys).toEqual(['sk_test_tenant_own_key'])
    expect(stripeConstructorKeys).not.toContain('sk_test_platform_fallback')
  })

  it('GET status check retrieves the account under the SAME tenant key POST created it with', async () => {
    const postReq = {} as unknown as Parameters<typeof POST>[0]
    await POST(postReq, { params: Promise.resolve({ id: TEAM_MEMBER_ID }) })

    const getReq = {} as unknown as Parameters<typeof GET>[0]
    const res = await GET(getReq, { params: Promise.resolve({ id: TEAM_MEMBER_ID }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.connected).toBe(true)
    // Both calls constructed Stripe with the tenant's own key — never the
    // platform fallback, so retrieve() never 404s on a cross-account lookup.
    expect(stripeConstructorKeys.every((k) => k === 'sk_test_tenant_own_key')).toBe(true)
  })

  it('falls back to the platform key only when the tenant has no own Stripe key', async () => {
    tenantStripeApiKey = null
    const req = {} as unknown as Parameters<typeof POST>[0]
    const res = await POST(req, { params: Promise.resolve({ id: TEAM_MEMBER_ID }) })
    expect(res.status).toBe(200)
    expect(stripeConstructorKeys).toEqual(['sk_test_platform_fallback'])
  })
})
