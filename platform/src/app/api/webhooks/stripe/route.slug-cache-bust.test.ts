import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — Full Loop self-serve signup's tenant-creation slug
 * negative-cache-bust gap.
 *
 * BUG (fixed here): tenant-lookup.ts's getTenantBySlug() caches a "no
 * tenant" result for the full 5-minute TTL on ANY miss (a bot/crawler
 * wildcard-subdomain scan of *.fullloopcrm.com is the realistic case for a
 * freshly-minted signup slug). invalidateTenantCache() can't reach that
 * entry — it only sweeps POSITIVE cache entries, matched by tenant id, and a
 * negative entry has none. invalidateSlugCache(slug) exists specifically to
 * close this window and is already wired into tenant DELETE
 * (admin/businesses/[id]/route.ts), but was never wired into this
 * Stripe-Checkout signup branch's own tenant insert. Without it, a paying
 * customer's brand-new subdomain could keep resolving to "no tenant" on a
 * warm edge isolate for up to the rest of the TTL immediately after this
 * webhook reports the signup as complete.
 *
 * FIX: bust invalidateSlugCache(slug) right after a successful tenant
 * insert, using the same derived slug the insert itself used.
 *
 * WRONG-TENANT PROBE: never busts an unrelated slug.
 */

let event: { type: string; data: { object: Record<string, unknown> } }

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => event }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

const prospectRow = {
  id: 'prospect_1',
  business_name: 'Acme Cleaning',
  trade: 'cleaning',
  owner_phone: '+15555550100',
  owner_email: 'owner@example.com',
  owner_name: 'Owner Name',
  tenant_id: null,
  paid_tier: 'pro',
  primary_city: 'Testville',
  primary_state: 'NY',
  primary_zip: '10001',
}

const invalidateSlugCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateSlugCache }))

vi.mock('@/lib/entity-provision', () => ({
  ensureDefaultEntity: vi.fn(async () => ({ id: 'entity_1' })),
}))
vi.mock('@/lib/provision-tenant', () => ({
  provisionTenant: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => {}),
}))

let prospectsFromCalls = 0

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'prospects') {
        prospectsFromCalls++
        if (prospectsFromCalls === 1) {
          return {
            update: () => ({
              eq: () => ({
                in: () => ({
                  select: () => ({
                    maybeSingle: async () => ({ data: { id: prospectRow.id }, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: prospectRow, error: null }),
            }),
          }),
          update: () => ({ eq: async () => ({ data: null, error: null }) }),
        }
      }
      if (table === 'tenants') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'tenant_1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'tenant_invites') {
        return { insert: async () => ({ data: null, error: null }) }
      }
      const noop: Record<string, unknown> = {
        select: () => noop, insert: () => noop, update: () => noop, eq: () => noop, in: () => noop,
        limit: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }
      return noop
    },
  },
}))

import { POST } from './route'

function req(body: string): Request {
  return {
    text: async () => body,
    headers: { get: () => 'sig_test' },
  } as unknown as Request
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  prospectsFromCalls = 0
  invalidateSlugCache.mockClear()
})

function checkoutEvent() {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        client_reference_id: null,
        metadata: { full_loop_signup: 'true', prospect_id: prospectRow.id, admins: '1', team_members: '0' },
      },
    },
  }
}

describe('Stripe webhook — Full Loop signup busts the new tenant\'s own negatively-cached slug', () => {
  it('BUG (fixed): a successful signup busts invalidateSlugCache with the derived slug the tenant insert used', async () => {
    event = checkoutEvent()
    const res = await POST(req('{}'))

    expect(res.status).toBe(200)
    expect(invalidateSlugCache).toHaveBeenCalledTimes(1)
    // Same derivation the route itself uses: business_name slugified, capped
    // at 48 chars, suffixed with the first 6 chars of the prospect id.
    expect(invalidateSlugCache).toHaveBeenCalledWith('acme-cleaning-prospe')
  })

  it('WRONG-TENANT PROBE: never busts an unrelated slug', async () => {
    event = checkoutEvent()
    await POST(req('{}'))
    expect(invalidateSlugCache).not.toHaveBeenCalledWith('bravo')
  })
})
