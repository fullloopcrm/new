import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleProcessStripeRefund (Yinez/Selena "process_stripe_refund" tool) had NO
 * idempotencyKey on stripe.refunds.create. An agent tool call can be retried
 * (timeout, duplicate dispatch) — without a key, a retried refund for the
 * SAME booking + amount on the SAME day mints a second, real Stripe refund.
 * This test drives runTool() twice with identical args and proves only one
 * real refund is issued; a distinct amount still goes through as its own
 * refund (the key is scoped by booking+amount+day, not booking alone, so
 * legitimate separate refunds aren't silently swallowed).
 */

const TENANT_ID = 'tenant_1'
const BOOKING_ID = 'book_refund_1'

const idempotencyStore = new Map<string, { id: string; status: string }>()
let realRefundCount = 0
const refundsCreate = vi.fn(async (_params: unknown, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey
  if (key && idempotencyStore.has(key)) return idempotencyStore.get(key)!
  realRefundCount++
  const refund = { id: `re_${realRefundCount}`, status: 'succeeded' }
  if (key) idempotencyStore.set(key, refund)
  return refund
})

vi.mock('stripe', () => {
  class MockStripe {
    refunds = { create: refundsCreate }
  }
  return { default: MockStripe }
})

function paymentsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({
      data: { id: 'pay_1', stripe_payment_intent_id: 'pi_refund_1', amount: 13800 },
      error: null,
    }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'payments') return paymentsBuilder()
      const noop: Record<string, unknown> = {
        select: () => noop, insert: () => noop, update: () => noop, eq: () => noop,
        order: () => noop, limit: () => noop,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: 'row_x' }, error: null }),
      }
      return noop
    },
  },
}))

vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => true }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => ''), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_ID) }))

import { runTool } from './tools'

beforeEach(() => {
  refundsCreate.mockClear()
  idempotencyStore.clear()
  realRefundCount = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
})

describe('process_stripe_refund — duplicate tool call does not double-refund the same booking', () => {
  it('two identical refund requests pass the same idempotencyKey and only one real refund is issued', async () => {
    const args = { booking_id: BOOKING_ID, amount_dollars: 50, reason: 'client complaint' }
    const stub = { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]

    const first = await runTool('process_stripe_refund', args, 'conv_1', 'owner_phone', stub, TENANT_ID)
    const second = await runTool('process_stripe_refund', args, 'conv_1', 'owner_phone', stub, TENANT_ID)

    expect(JSON.parse(first).ok).toBe(true)
    expect(JSON.parse(second).ok).toBe(true)

    expect(refundsCreate).toHaveBeenCalledTimes(2)
    const [, firstOptions] = refundsCreate.mock.calls[0]
    const [, secondOptions] = refundsCreate.mock.calls[1]
    const today = new Date().toISOString().slice(0, 10)
    expect(firstOptions).toEqual({ idempotencyKey: `refund-${BOOKING_ID}-5000-${today}` })
    expect(secondOptions).toEqual({ idempotencyKey: `refund-${BOOKING_ID}-5000-${today}` })

    // Only ONE real Stripe refund was minted for the duplicate call.
    expect(realRefundCount).toBe(1)
  })

  it('a distinct amount for the same booking is a genuinely new refund, not deduped', async () => {
    const stub = { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]

    await runTool('process_stripe_refund', { booking_id: BOOKING_ID, amount_dollars: 50 }, 'conv_1', 'owner_phone', stub, TENANT_ID)
    await runTool('process_stripe_refund', { booking_id: BOOKING_ID, amount_dollars: 25 }, 'conv_1', 'owner_phone', stub, TENANT_ID)

    expect(refundsCreate).toHaveBeenCalledTimes(2)
    expect(realRefundCount).toBe(2)
  })
})
