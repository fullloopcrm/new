import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — customer.subscription.deleted billing_status write —
 * masked-DB-error fix.
 *
 * BUG (fixed here): unlike invoice.paid / invoice.payment_failed (fixed
 * separately, same file), this branch never had a tenant *lookup* step to
 * begin with — it went straight from the Stripe customer email to a direct
 * `.from('tenants').update({ billing_status: 'cancelled', ... }).eq('owner_email', email)`
 * with NO `error` destructured from the call at all. The whole branch was
 * also wrapped in a try/catch meant for the Stripe API `customers.retrieve()`
 * call, so even an explicit throw on the write's error would have been
 * silently swallowed by that same catch. A genuine DB failure on this write
 * meant a real subscription cancellation never flipped billing_status to
 * 'cancelled' — the tenant keeps full dashboard access and billing keeps
 * treating them as active/past_due indefinitely — with zero signal and no
 * chance for Stripe's own retry policy to redeliver once the DB recovers.
 * Same masked-error class as the invoice.paid/invoice.payment_failed fix in
 * this same file.
 *
 * FIX: check the update's `error` explicitly, OUTSIDE the customers.retrieve
 * try/catch, and throw (uncaught -> 500, not a silent 200 "received: true").
 */

let event: { type: string; data: { object: Record<string, unknown> } }

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => event }
    customers = { retrieve: async () => ({ deleted: false, email: 'owner@example.com' }) }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          update: () => ({
            eq: async () => ({ data: null, error: { message: 'connection reset' } }),
          }),
        }
      }
      const noop: Record<string, unknown> = {
        select: () => noop, insert: () => noop, update: () => noop, eq: () => noop,
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

describe('Stripe webhook — customer.subscription.deleted billing_status masked DB error', () => {
  it('a genuine DB failure on the billing_status=cancelled write surfaces loud (500), not a silent skip', async () => {
    event = { type: 'customer.subscription.deleted', data: { object: { customer: 'cus_123' } } }
    await expect(POST(req('{}'))).rejects.toThrow('STRIPE_SUBSCRIPTION_DELETED_UPDATE_ERROR')
  })
})
