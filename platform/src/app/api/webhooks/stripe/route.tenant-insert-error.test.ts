import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — Full Loop self-serve signup's `tenants` insert —
 * masked-DB-error fix.
 *
 * BUG (fixed here): the tenant-creation insert only destructured `data`,
 * not `error`. A genuine DB failure left `tenant` undefined, which silently
 * skipped provisioning, the owner invite, and the welcome email entirely —
 * the paid prospect stayed claimed (status:'paid') with no tenant ever
 * created and no retry path (the CAS guard above only lets one webhook
 * delivery through), and the webhook still returned 200.
 *
 * FIX: check the insert's `error` explicitly and throw.
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
              single: async () => ({ data: null, error: { message: 'unique constraint violation' } }),
            }),
          }),
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

describe('Stripe webhook — Full Loop signup tenants insert masked DB error', () => {
  it('a genuine DB failure on the tenant insert surfaces loud (throws), instead of silently skipping provisioning', async () => {
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
    await expect(POST(req('{}'))).rejects.toThrow('TENANT_INSERT_ERROR')
  })
})
