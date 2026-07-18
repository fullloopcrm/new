import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — invoice.paid / invoice.payment_failed tenant-by-owner_email
 * lookup — masked-DB-error fix.
 *
 * BUG (fixed here): both branches resolved the tenant via
 * `.from('tenants').select(...).eq('owner_email', customerEmail).maybeSingle()`
 * and only destructured `data`, discarding `error`. A genuine DB failure
 * looked identical to "no tenant with this owner_email" and hit the same
 * `if (!tenant) break` no-op — a real renewal payment silently never flipped
 * billing_status back to `active`, and a real failed payment silently never
 * flipped billing_status to `past_due` or alerted the admin, instead of
 * failing loud so Stripe's own webhook retry policy gets a chance to
 * redeliver once the DB recovers. Same masked-error class already fixed
 * across tenant.ts/tenant-lookup.ts/domains.ts and the telnyx inbound-SMS
 * tenant resolver.
 *
 * FIX: check `error` explicitly and throw (uncaught -> 500, not a silent
 * 200 "received: true") instead of discarding it.
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
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: { message: 'connection reset' } }),
            }),
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

describe('Stripe webhook — invoice tenant lookup masked DB error', () => {
  it('invoice.paid: a genuine DB failure on the owner_email tenant lookup surfaces loud (500), not a silent skip', async () => {
    event = { type: 'invoice.paid', data: { object: { customer_email: 'owner@example.com' } } }
    await expect(POST(req('{}'))).rejects.toThrow('STRIPE_INVOICE_PAID_TENANT_LOOKUP_ERROR')
  })

  it('invoice.payment_failed: a genuine DB failure on the owner_email tenant lookup surfaces loud (500), not a silent skip', async () => {
    event = { type: 'invoice.payment_failed', data: { object: { customer_email: 'owner@example.com' } } }
    await expect(POST(req('{}'))).rejects.toThrow('STRIPE_INVOICE_PAYMENT_FAILED_TENANT_LOOKUP_ERROR')
  })
})
