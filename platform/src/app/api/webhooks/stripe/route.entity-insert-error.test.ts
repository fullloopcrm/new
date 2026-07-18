import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — Full Loop self-serve signup's default-entity seed —
 * masked-error + resolver-twin fix.
 *
 * BUG (fixed here): after the tenant row was created, this branch hand-rolled
 * its own `supabaseAdmin.from('entities').insert(...)` with the result not
 * even destructured — a genuine DB failure (RLS deny, transient blip) was
 * completely invisible. Worse, it duplicated (without the idempotency guard
 * or error check) the canonical `ensureDefaultEntity()` helper that
 * `activateTenant()` — documented as "the ONE path every creation door
 * should ultimately funnel through" — already uses. A tenant with no default
 * entity has nowhere for finance rows (entity_id) or legal identity fields
 * to land, with zero signal to anyone that seeding failed.
 *
 * FIX: call the shared `ensureDefaultEntity()` helper instead, left
 * unwrapped so a genuine failure throws uncaught → 500 → Stripe retry,
 * matching the claim/fetch/tenant-insert idiom in the same branch.
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
      if (table === 'entities') {
        // ensureDefaultEntity()'s own real implementation runs here (not
        // mocked) — it checks for an existing default entity (none), then
        // inserts, and the insert fails with a genuine DB error.
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: async () => ({ data: null, error: { message: 'connection reset' } }),
        }
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
})

describe('Stripe webhook — Full Loop signup default-entity seed masked DB error', () => {
  it('a genuine DB failure on the default-entity insert surfaces loud (throws) via the shared ensureDefaultEntity() helper', async () => {
    event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          client_reference_id: null,
          metadata: { full_loop_signup: 'true', prospect_id: prospectRow.id, admins: '1', team_members: '0' },
        },
      },
    }
    await expect(POST(req('{}'))).rejects.toThrow()
  })
})
