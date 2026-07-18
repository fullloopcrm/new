import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * W4 — process_stripe_refund (owner tool, driven by the Telegram owner
 * webhook) called stripe.refunds.create with no idempotency key. Telegram
 * retries webhook delivery when the handler doesn't ack quickly (documented
 * behavior; askSelena's agent loop can easily run long), so a retried
 * delivery re-runs the same "refund $X for booking Y" instruction and fires
 * a second, real Stripe refund for money already refunded. Same bug class as
 * payment-processor.ts's cleaner-payout transfer, which already carries an
 * idempotencyKey for exactly this reason.
 *
 * Fix: idempotencyKey derived from (tenant, booking, payment_intent, amount,
 * 5-min bucket) so Stripe itself dedupes a same-request replay within the
 * window, while a genuinely new later refund for the same booking/amount
 * still goes through.
 */

const refundsCreateMock = vi.fn(async (_params: unknown, opts?: { idempotencyKey?: string }) => ({
  id: 're_1',
  status: 'succeeded',
  __idempotencyKey: opts?.idempotencyKey,
}))

vi.mock('stripe', () => ({
  default: class MockStripe {
    refunds = { create: refundsCreateMock }
  },
}))

const paymentRow = { id: 'pay-1', stripe_payment_intent_id: 'pi_123', amount: 100 }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'payments') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: paymentRow }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      // bookings update — no-op chain
      return {
        update: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }),
      }
    },
  },
}))

vi.mock('@/lib/selena/agent', () => ({
  isOwnerOfTenant: vi.fn(async () => true),
}))

vi.mock('@/lib/selena/core', () => ({
  handleTool: vi.fn(),
  EMPTY_CHECKLIST: {},
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_123'
})

describe('process_stripe_refund idempotency', () => {
  it('passes a stable idempotencyKey derived from booking + payment intent + amount', async () => {
    const { runTool } = await import('@/lib/selena/tools')
    const result = { text: '', checklist: {} } as never

    await runTool(
      'process_stripe_refund',
      { booking_id: 'bk-1', amount_dollars: 25 },
      'convo-1',
      '+15550001111',
      result,
      'tenant-1'
    )

    expect(refundsCreateMock).toHaveBeenCalledTimes(1)
    const [, opts] = refundsCreateMock.mock.calls[0]
    expect(opts?.idempotencyKey).toContain('tenant-1')
    expect(opts?.idempotencyKey).toContain('bk-1')
    expect(opts?.idempotencyKey).toContain('pi_123')
    expect(opts?.idempotencyKey).toContain('2500') // amount in cents
  })

  it('uses the same idempotencyKey on an immediate retry of the same instruction', async () => {
    const { runTool } = await import('@/lib/selena/tools')
    const result = { text: '', checklist: {} } as never

    await runTool('process_stripe_refund', { booking_id: 'bk-1', amount_dollars: 25 }, 'convo-1', '+15550001111', result, 'tenant-1')
    await runTool('process_stripe_refund', { booking_id: 'bk-1', amount_dollars: 25 }, 'convo-1', '+15550001111', result, 'tenant-1')

    expect(refundsCreateMock).toHaveBeenCalledTimes(2)
    const key1 = refundsCreateMock.mock.calls[0][1]?.idempotencyKey
    const key2 = refundsCreateMock.mock.calls[1][1]?.idempotencyKey
    expect(key1).toBe(key2)
  })

  it('produces a different idempotencyKey for a different amount on the same booking', async () => {
    const { runTool } = await import('@/lib/selena/tools')
    const result = { text: '', checklist: {} } as never

    await runTool('process_stripe_refund', { booking_id: 'bk-1', amount_dollars: 25 }, 'convo-1', '+15550001111', result, 'tenant-1')
    await runTool('process_stripe_refund', { booking_id: 'bk-1', amount_dollars: 40 }, 'convo-1', '+15550001111', result, 'tenant-1')

    const key1 = refundsCreateMock.mock.calls[0][1]?.idempotencyKey
    const key2 = refundsCreateMock.mock.calls[1][1]?.idempotencyKey
    expect(key1).not.toBe(key2)
  })
})
