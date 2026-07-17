/**
 * STRIPE WEBHOOK — `charge.dispute.closed` had zero handling, same fresh-
 * ground shape as item (102)'s `email.complained` gap.
 *
 * `charge.dispute.created` already books the chargeback as a loss
 * (postChargebackToLedger). When Stripe later closes the dispute with
 * status 'won', the merchant gets the disputed funds back — but nothing
 * reversed that loss in the ledger, so a tenant who won every dispute they
 * ever opened would show permanently overstated chargeback losses forever.
 * 'lost'/other statuses correctly need no ledger action (Stripe kept the
 * funds; the original loss entry is already correct).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn().mockResolvedValue(undefined) }))

const { postChargebackReversalToLedger, tenantFromPaymentIntent } = vi.hoisted(() => ({
  postChargebackReversalToLedger: vi.fn().mockResolvedValue({ posted: true, entryId: 'je-1' }),
  tenantFromPaymentIntent: vi.fn(),
}))

vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn().mockResolvedValue(undefined),
  postRefundToLedger: vi.fn().mockResolvedValue(undefined),
  postChargebackToLedger: vi.fn().mockResolvedValue(undefined),
  postChargebackReversalToLedger,
  tenantFromPaymentIntent,
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn().mockResolvedValue(undefined) }))

let constructEventImpl: (body: string) => unknown = () => { throw new Error('no event configured') }

vi.mock('stripe', () => {
  class FakeStripe {
    webhooks = { constructEvent: (body: string) => constructEventImpl(body) }
    transfers = { create: vi.fn() }
    payouts = { create: vi.fn() }
    customers = { retrieve: vi.fn() }
  }
  return { default: FakeStripe }
})

process.env.STRIPE_SECRET_KEY = 'sk_test_x'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
void fake // silence unused-import if fake-supabase isn't otherwise touched here

const TENANT_ID = 'tenant-1'

function postDisputeClosed(status: string, disputeId = 'dp_1', amount = 5_000) {
  const dispute = {
    id: disputeId,
    amount,
    status,
    payment_intent: 'pi_1',
  } as unknown as Row
  constructEventImpl = () => ({ type: 'charge.dispute.closed', data: { object: dispute } })
  return POST(new Request('https://x.test/api/webhooks/stripe', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'stripe-signature': 'sig' },
  }))
}

describe("charge.dispute.closed — 'won' reverses the chargeback loss", () => {
  it("posts a chargeback reversal when status is 'won'", async () => {
    tenantFromPaymentIntent.mockResolvedValueOnce({ tenantId: TENANT_ID, bookingId: null })
    postChargebackReversalToLedger.mockClear()

    const res = await postDisputeClosed('won', 'dp_won', 7_500)
    expect(res.status).toBe(200)

    expect(postChargebackReversalToLedger).toHaveBeenCalledTimes(1)
    expect(postChargebackReversalToLedger).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, sourceId: 'dp_won', amountCents: 7_500 }),
    )
  })

  it("does NOT post a reversal when status is 'lost' — Stripe kept the funds", async () => {
    tenantFromPaymentIntent.mockResolvedValueOnce({ tenantId: TENANT_ID, bookingId: null })
    postChargebackReversalToLedger.mockClear()

    const res = await postDisputeClosed('lost', 'dp_lost')
    expect(res.status).toBe(200)

    expect(postChargebackReversalToLedger).not.toHaveBeenCalled()
  })

  it("does NOT post a reversal when status is 'warning_closed'", async () => {
    tenantFromPaymentIntent.mockResolvedValueOnce({ tenantId: TENANT_ID, bookingId: null })
    postChargebackReversalToLedger.mockClear()

    const res = await postDisputeClosed('warning_closed', 'dp_warn')
    expect(res.status).toBe(200)

    expect(postChargebackReversalToLedger).not.toHaveBeenCalled()
  })
})
