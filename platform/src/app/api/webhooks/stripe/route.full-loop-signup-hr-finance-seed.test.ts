import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The prospects/admin-approve checkout flow (metadata.full_loop_signup==='true')
 * is a SECOND, separate tenant-creation door from stripe-platform's
 * createTenantFromLead+activateTenant flow. It creates the tenant + entity +
 * provisionTenant() directly, but never called ensureDefaultEntity's sibling
 * finance/HR seeders (seedChartOfAccounts, seedHrDefaults) the way
 * activateTenant's step 3b does -- so a tenant born here had no chart of
 * accounts (P&L/ledger totally broken) and no HR doc-requirement template.
 * It also cast prospect.trade to a hand-picked 6-value union instead of
 * running it through mapIndustry(), so most real trades (dumpster, roofing,
 * etc.) either failed the cast or silently fell through to 'general'.
 *
 * This test drives the real handler through that exact branch and asserts
 * the new seeding calls fire with the tenant id + a properly normalized
 * industry (mapIndustry('Dumpster Rental') === 'dumpster', not 'general').
 */

const TENANT_ID = 'tenant-new-1'
const PROSPECT_ID = 'prospect-1'

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
  }
  return { default: MockStripe }
})

const { ensureDefaultEntity, seedChartOfAccounts, seedHrDefaults, provisionTenant } = vi.hoisted(() => ({
  ensureDefaultEntity: vi.fn(async () => true),
  seedChartOfAccounts: vi.fn(async () => 12),
  seedHrDefaults: vi.fn(async () => ({ requirementsSeeded: 7, profilesBackfilled: 0 })),
  provisionTenant: vi.fn(async () => ({ seeded: {}, skipped: [] })),
}))

vi.mock('@/lib/entity-provision', () => ({ ensureDefaultEntity }))
vi.mock('@/lib/ledger', () => ({ seedChartOfAccounts }))
vi.mock('@/lib/hr', () => ({ seedHrDefaults }))
vi.mock('@/lib/provision-tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/provision-tenant')>('@/lib/provision-tenant')
  return { ...actual, provisionTenant }
})
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))

let insertedTenant: Record<string, unknown> | null = null

function chain(table: string) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    single: async () => {
      if (table === 'prospects') {
        return {
          data: {
            id: PROSPECT_ID,
            tenant_id: null,
            business_name: 'Acme Dumpster Co',
            trade: 'Dumpster Rental',
            owner_phone: '+15551230000',
            owner_email: 'owner@example.com',
            owner_name: 'Jane Owner',
            paid_tier: 'pro',
            primary_city: 'Brooklyn',
            primary_state: 'NY',
            primary_zip: '11201',
          },
          error: null,
        }
      }
      return { data: null, error: null }
    },
    maybeSingle: async () => ({ data: null, error: null }),
    update: (row: Record<string, unknown>) => {
      const claimResult = {
        select: () => ({
          maybeSingle: async () => {
            if (table === 'prospects' && row.status === 'paid') {
              return { data: { id: PROSPECT_ID }, error: null }
            }
            return { data: null, error: null }
          },
        }),
      }
      return {
        ...c,
        eq: () => ({ ...claimResult, in: () => claimResult }),
        then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
      }
    },
    insert: (row: Record<string, unknown>) => {
      if (table === 'tenants') {
        insertedTenant = { id: TENANT_ID, ...row }
        return { select: () => ({ single: async () => ({ data: { id: TENANT_ID }, error: null }) }) }
      }
      return {
        select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }),
        then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
      }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

import { POST } from './route'

function signupEvent() {
  const session = {
    id: 'cs_signup_1',
    amount_total: 250000,
    client_reference_id: PROSPECT_ID,
    metadata: { prospect_id: PROSPECT_ID, full_loop_signup: 'true', admins: '1', team_members: '0' },
    subscription: 'sub_1',
  }
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }),
  })
}

beforeEach(() => {
  insertedTenant = null
  ensureDefaultEntity.mockClear()
  seedChartOfAccounts.mockClear()
  seedHrDefaults.mockClear()
  provisionTenant.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe — full_loop_signup finance/HR seeding', () => {
  it('normalizes industry via mapIndustry and seeds chart of accounts + HR doc requirements', async () => {
    const res = await POST(signupEvent())
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ received: true, signup_paid: true })

    // 'Dumpster Rental' must resolve to the real IndustryKey 'dumpster', not
    // fall through to 'general' the way the old hand-picked-union cast did.
    expect(insertedTenant).toMatchObject({ industry: 'dumpster' })

    expect(ensureDefaultEntity).toHaveBeenCalledWith(TENANT_ID, 'Acme Dumpster Co')
    expect(seedChartOfAccounts).toHaveBeenCalledWith(TENANT_ID)
    expect(seedHrDefaults).toHaveBeenCalledWith(TENANT_ID, 'dumpster')
    expect(provisionTenant).toHaveBeenCalledWith({ tenantId: TENANT_ID, industry: 'dumpster' })
  })
})
