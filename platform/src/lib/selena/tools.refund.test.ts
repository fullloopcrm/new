/**
 * MISSING-IDEMPOTENCY-KEY fix — Selena's process_stripe_refund tool.
 *
 * LEADER finding (2026-07-13): handleProcessStripeRefund() called
 * stripe.refunds.create() with no idempotencyKey and no check that the
 * booking wasn't already refunded. An LLM tool-call retry, or the owner
 * simply asking Selena to "refund it" twice in the same conversation, fired
 * a second real Stripe refund for the same payment. Fixed with (1) a
 * pre-check that short-circuits if the booking is already payment_status
 * 'refunded', and (2) an idempotencyKey on the Stripe call keyed by
 * payment id + amount so an exact retry can't double-refund.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const refundsCreate = vi.fn().mockResolvedValue({ id: 're_test', status: 'succeeded' })

vi.mock('stripe', () => {
  class FakeStripe {
    refunds = { create: refundsCreate }
  }
  return { default: FakeStripe }
})

process.env.STRIPE_SECRET_KEY = 'sk_test_x'

import { supabaseAdmin } from '@/lib/supabase'
import { handleProcessStripeRefund } from './tools'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const BOOKING_ID = 'booking-1'
const PAYMENT_ID = 'payment-1'

function seed(paymentStatus = 'paid') {
  fake._seed('bookings', [{ id: BOOKING_ID, tenant_id: TENANT_ID, payment_status: paymentStatus }])
  fake._seed('payments', [
    {
      id: PAYMENT_ID,
      tenant_id: TENANT_ID,
      booking_id: BOOKING_ID,
      stripe_payment_intent_id: 'pi_test_1',
      amount: 10_000,
      created_at: '2026-07-01T00:00:00Z',
    },
  ])
}

beforeEach(() => {
  fake._store.clear()
  refundsCreate.mockClear()
})

describe('handleProcessStripeRefund idempotency', () => {
  it('passes a stable idempotencyKey keyed by payment id + amount', async () => {
    seed()
    const out = JSON.parse(await handleProcessStripeRefund({ booking_id: BOOKING_ID, amount_dollars: 100 }, TENANT_ID))
    expect(out.ok).toBe(true)
    expect(refundsCreate).toHaveBeenCalledTimes(1)
    const [, opts] = refundsCreate.mock.calls[0]
    expect(opts.idempotencyKey).toBe(`selena-refund:${PAYMENT_ID}:10000`)
  })

  it('refuses to refund again once the booking is already marked refunded', async () => {
    seed('refunded')
    const out = JSON.parse(await handleProcessStripeRefund({ booking_id: BOOKING_ID, amount_dollars: 100 }, TENANT_ID))
    expect(out.error).toMatch(/already/i)
    expect(refundsCreate).not.toHaveBeenCalled()
  })

  it('a second call after the first succeeds is rejected by the already-refunded pre-check', async () => {
    seed()
    const first = JSON.parse(await handleProcessStripeRefund({ booking_id: BOOKING_ID, amount_dollars: 100 }, TENANT_ID))
    expect(first.ok).toBe(true)

    const second = JSON.parse(await handleProcessStripeRefund({ booking_id: BOOKING_ID, amount_dollars: 100 }, TENANT_ID))
    expect(second.error).toMatch(/already/i)
    expect(refundsCreate).toHaveBeenCalledTimes(1)
  })
})
