import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — Full Loop self-serve signup's post-claim prospect fetch —
 * masked-DB-error fix.
 *
 * BUG (fixed here): immediately after a successful CAS claim, the full
 * prospect row is re-fetched with `.select('*').eq('id', prospectId).single()`
 * but only `data` was destructured. A genuine DB failure here left `prospect`
 * undefined, which silently skipped the entire tenant-creation block below
 * (`if (prospect && !prospect.tenant_id)` was simply false) — the prospect
 * stayed claimed (status:'paid') with no tenant ever created, and the
 * webhook still returned 200, so Stripe never retries.
 *
 * FIX: check the fetch's `error` explicitly and throw.
 */

let event: { type: string; data: { object: Record<string, unknown> } }

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => event }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

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
                    maybeSingle: async () => ({ data: { id: 'prospect_1' }, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { message: 'connection reset' } }),
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

describe('Stripe webhook — Full Loop signup post-claim prospect fetch masked DB error', () => {
  it('a genuine DB failure on the prospect re-fetch surfaces loud (throws), instead of silently skipping tenant creation', async () => {
    event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          client_reference_id: null,
          metadata: { full_loop_signup: 'true', prospect_id: 'prospect_1', admins: '1', team_members: '0' },
        },
      },
    }
    await expect(POST(req('{}'))).rejects.toThrow('PROSPECT_FETCH_ERROR')
  })
})
