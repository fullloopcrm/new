import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * W4 cross-tenant generalization probe.
 *
 * REAL GAP: POST /api/team-members/[id]/stripe-onboard (this route) creates
 * the Connect Express account via getStripe() with NO key argument — it never
 * reads tenant.stripe_api_key, unlike every sibling Stripe route in this
 * codebase (sales-partners/[id]/stripe-onboard, team-members/[id]/stripe-status,
 * payments/checkout, invoices checkout, bank-connect/session — all read
 * tenant.stripe_api_key first, env as fallback). The completion poll at
 * /stripe-onboard/complete calls POST /api/team-members/[id]/stripe-status,
 * which DOES read tenant.stripe_api_key.
 *
 * For any tenant with its own stripe_api_key configured (confirmed live
 * example: "We Pay You Junk", 2 team members, verified via Supabase Mgmt API
 * 2026-07-22), onboard creates the Express account under the PLATFORM key
 * while status retrieves it under the TENANT's own key — two different
 * Stripe accounts can never see each other's connected-account IDs, so the
 * retrieve fails. nycmaid never surfaces this because it has no own key, so
 * both routes silently share the same env fallback.
 *
 * This test proves the divergence: same team member, same account_id,
 * onboard route's key vs status route's key disagree once a tenant has its
 * own stripe_api_key set.
 */

const TENANT_ID = 'tenant-with-own-stripe-key'
const TEAM_MEMBER_ID = 'tm-1'
const PLATFORM_KEY = 'sk_test_PLATFORM_FALLBACK'
const TENANT_OWN_KEY = 'sk_test_TENANT_OWN_KEY'

// namespace: accountId -> key it was created under
const accountRegistry = new Map<string, string>()

vi.mock('stripe', () => {
  class MockStripe {
    constructor(private apiKey: string) {}
    accounts = {
      create: vi.fn(async () => {
        const id = `acct_${accountRegistry.size + 1}`
        accountRegistry.set(id, this.apiKey)
        return { id }
      }),
      retrieve: vi.fn(async (id: string) => {
        const ownerKey = accountRegistry.get(id)
        if (ownerKey !== this.apiKey) {
          throw new Error(`No such account: ${id} (created under a different Stripe account)`)
        }
        return { id, charges_enabled: true, payouts_enabled: true, details_submitted: true, capabilities: { transfers: 'active' } }
      }),
    }
    accountLinks = { create: vi.fn(async () => ({ url: 'https://connect.stripe.com/onboard' })) }
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

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  accountRegistry.clear()
  process.env.STRIPE_SECRET_KEY = PLATFORM_KEY
  fake._seed('tenants', [{ id: TENANT_ID, stripe_api_key: TENANT_OWN_KEY }])
  fake._seed('team_members', [
    { id: TEAM_MEMBER_ID, tenant_id: TENANT_ID, name: 'Cleaner', email: 'cleaner@example.com', phone: null, stripe_account_id: null },
  ])
})

describe('team-members stripe-onboard vs stripe-status: tenant stripe_api_key parity', () => {
  it('BUG: onboard mints the Connect account under the platform key, status then fails to retrieve it under the tenant\'s own key', async () => {
    const { POST: onboardPOST } = await import('./route')
    const { POST: statusPOST } = await import('../stripe-status/route')

    const onboardRes = await onboardPOST({} as never, { params: Promise.resolve({ id: TEAM_MEMBER_ID }) })
    expect(onboardRes.status).toBe(200)
    const { account_id } = await onboardRes.json()
    expect(account_id).toBeDefined()

    // Prove the account was created under the PLATFORM key, not the tenant's own key.
    expect(accountRegistry.get(account_id)).toBe(PLATFORM_KEY)

    const statusRes = await statusPOST({} as never, { params: Promise.resolve({ id: TEAM_MEMBER_ID }) })
    const statusBody = await statusRes.json()

    // This is the bug: status-refresh (which correctly uses tenant.stripe_api_key)
    // can never see an account minted under the platform key, so the real,
    // completed Stripe onboarding is reported as an error/not-ready forever.
    expect(statusRes.status).toBe(500)
    expect(statusBody.error).toMatch(/No such account/)
  })
})
