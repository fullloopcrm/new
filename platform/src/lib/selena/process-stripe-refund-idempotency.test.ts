import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * process_stripe_refund (Selena/Jefe owner tool) — no double-submit
 * protection at all.
 *
 * Unlike every other money-moving path in this codebase (every payments
 * insert is guarded by a DB unique index + 23505 catch), this tool called
 * stripe.refunds.create() with no idempotency key and no dedup check. A
 * double-tapped refund request, an agent-framework retry on a slow/timed-out
 * response, or two admin sessions approving the same refund would each fire
 * a SEPARATE real Stripe refund -- a genuine "real money" bug, not just a
 * data-consistency one.
 *
 * Fix: pass a deterministic idempotencyKey (tenant + booking + amount) to
 * Stripe so it -- not app code racing a read-then-write -- collapses
 * concurrent/retried calls into the single real refund.
 */

const refundsCreate = vi.fn(async (params: Record<string, unknown>, _options?: { idempotencyKey: string }) => ({
  id: 're_test_1',
  status: 'succeeded',
  amount: params.amount,
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('stripe', () => ({
  default: class {
    refunds = { create: refundsCreate }
  },
}))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-A'
const OWNER_PHONE = '3105559999'
const BOOKING_ID = 'booking-1'

function freshResult(): YinezResult {
  return { text: '', toolsCalled: [] }
}

beforeEach(() => {
  refundsCreate.mockClear()
  fake._store.clear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  fake._seed('tenants', [{ id: TENANT_ID, owner_phone: OWNER_PHONE }])
  fake._seed('payments', [
    { id: 'pay-1', tenant_id: TENANT_ID, booking_id: BOOKING_ID, stripe_payment_intent_id: 'pi_123', amount: 5000 },
  ])
})

describe('process_stripe_refund — Stripe idempotency key', () => {
  it('passes a deterministic idempotencyKey scoped to tenant + booking + amount', async () => {
    await runTool(
      'process_stripe_refund',
      { booking_id: BOOKING_ID, amount_dollars: 50 },
      'conv-1',
      OWNER_PHONE,
      freshResult(),
      TENANT_ID,
      true,
    )

    expect(refundsCreate).toHaveBeenCalledTimes(1)
    const [, options] = refundsCreate.mock.calls[0]
    expect(options).toMatchObject({ idempotencyKey: expect.stringContaining(`${TENANT_ID}-${BOOKING_ID}-5000`) })
  })

  it('uses the SAME key across two calls for the same booking + amount (what makes Stripe collapse the retry)', async () => {
    await runTool('process_stripe_refund', { booking_id: BOOKING_ID, amount_dollars: 50 }, 'conv-1', OWNER_PHONE, freshResult(), TENANT_ID, true)
    await runTool('process_stripe_refund', { booking_id: BOOKING_ID, amount_dollars: 50 }, 'conv-2', OWNER_PHONE, freshResult(), TENANT_ID, true)

    expect(refundsCreate).toHaveBeenCalledTimes(2)
    const key1 = refundsCreate.mock.calls[0][1]?.idempotencyKey
    const key2 = refundsCreate.mock.calls[1][1]?.idempotencyKey
    expect(key1).toBe(key2)
  })

  it('uses a DIFFERENT key for a genuinely distinct amount (a real second partial refund is not blocked)', async () => {
    await runTool('process_stripe_refund', { booking_id: BOOKING_ID, amount_dollars: 50 }, 'conv-1', OWNER_PHONE, freshResult(), TENANT_ID, true)
    await runTool('process_stripe_refund', { booking_id: BOOKING_ID, amount_dollars: 25 }, 'conv-2', OWNER_PHONE, freshResult(), TENANT_ID, true)

    const key1 = refundsCreate.mock.calls[0][1]?.idempotencyKey
    const key2 = refundsCreate.mock.calls[1][1]?.idempotencyKey
    expect(key1).not.toBe(key2)
  })
})
