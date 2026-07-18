import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — Full Loop self-serve signup's prospect CAS-claim update —
 * masked-DB-error fix.
 *
 * BUG (fixed here): the compare-and-swap `prospects` update that claims a
 * paid signup (status approved|reviewing|new → paid) only destructured
 * `data`, not `error`. maybeSingle() legitimately returns data:null when
 * another delivery already won the race (the normal case this comparison
 * exists for) — but a genuine DB-level failure (RLS deny, connection reset)
 * looked IDENTICAL to that and silently took the early-return
 * `{received:true, already_processed:true}` path: a real Stripe payment
 * would vanish with no tenant ever created, no error, and no retry, since
 * the webhook still reported success.
 *
 * FIX: check the update's `error` explicitly and throw before the
 * data:null idempotent-skip check runs.
 */

let event: { type: string; data: { object: Record<string, unknown> } }

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => event }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'prospects') {
        return {
          update: () => ({
            eq: () => ({
              in: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: null, error: { message: 'connection reset' } }),
                }),
              }),
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
})

describe('Stripe webhook — Full Loop signup prospect CAS-claim masked DB error', () => {
  it('a genuine DB failure on the claim update surfaces loud (throws), instead of a silent already_processed skip', async () => {
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
    await expect(POST(req('{}'))).rejects.toThrow('PROSPECT_CLAIM_ERROR')
  })
})
