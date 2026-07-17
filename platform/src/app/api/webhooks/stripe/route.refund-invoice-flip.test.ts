/**
 * Item (139) — continuing (138)'s surface. `charge.refunded` already called
 * postRefundToLedger() so the GL was correctly reversed, but it never touched
 * the linked invoice or payment row — a Stripe-initiated refund left the
 * invoice permanently stuck at 'paid' with no 'refunded' badge, no filter
 * hit, and amount_paid_cents still showing the refunded money as collected.
 * Full-charge refunds now flip the invoice/payment via markInvoicePaymentRefunded.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
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

const postRefundToLedger = vi.fn().mockResolvedValue({ posted: true, entryId: 'je-1' })
vi.mock('@/lib/finance/post-adjustments', async (orig) => {
  const actual = await orig<typeof import('@/lib/finance/post-adjustments')>()
  return {
    ...actual,
    postDepositToLedger: vi.fn().mockResolvedValue(undefined),
    postRefundToLedger: (...args: unknown[]) => postRefundToLedger(...args),
    postChargebackToLedger: vi.fn().mockResolvedValue(undefined),
  }
})
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
const TENANT_ID = 'tenant-1'
const INVOICE_ID = 'inv-1'
const PAYMENT_ID = 'pay-1'
const PI_ID = 'pi_charge1'

function postChargeRefunded(amountRefunded: number, chargeAmount: number) {
  const charge = {
    id: 'ch_1',
    amount: chargeAmount,
    amount_refunded: amountRefunded,
    payment_intent: PI_ID,
    refunds: { data: [{ id: 're_1', amount: amountRefunded }] },
  } as unknown as Row
  constructEventImpl = () => ({ type: 'charge.refunded', data: { object: charge } })
  return POST(new Request('https://x.test/api/webhooks/stripe', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'stripe-signature': 'sig' },
  }))
}

beforeEach(() => {
  fake._store.clear()
  postRefundToLedger.mockClear()
  fake._seed('invoices', [
    { id: INVOICE_ID, tenant_id: TENANT_ID, status: 'paid', amount_paid_cents: 20000, total_cents: 20000 },
  ])
  fake._seed('payments', [
    { id: PAYMENT_ID, tenant_id: TENANT_ID, invoice_id: INVOICE_ID, booking_id: null, amount_cents: 20000, status: 'succeeded', stripe_payment_intent_id: PI_ID },
  ])
})

describe('charge.refunded webhook — invoice/payment flip', () => {
  it('flips the linked invoice to refunded and the payment row to refunded on a full-charge refund', async () => {
    const res = await postChargeRefunded(20000, 20000)
    expect(res.status).toBe(200)

    const invoice = fake._all('invoices').find(r => r.id === INVOICE_ID)
    expect(invoice?.status).toBe('refunded')

    const payment = fake._all('payments').find(r => r.id === PAYMENT_ID)
    expect(payment?.status).toBe('refunded')

    const activity = fake._all('invoice_activity').find(r => r.invoice_id === INVOICE_ID)
    expect(activity?.event_type).toBe('refunded')
  })

  it('still posts the ledger reversal (pre-existing behavior, unaffected by the flip)', async () => {
    await postChargeRefunded(20000, 20000)
    expect(postRefundToLedger).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, sourceId: 're_1', amountCents: 20000 }),
    )
  })

  it('leaves the invoice/payment alone on a partial refund of a single charge', async () => {
    const res = await postChargeRefunded(5000, 20000)
    expect(res.status).toBe(200)

    const invoice = fake._all('invoices').find(r => r.id === INVOICE_ID)
    expect(invoice?.status).toBe('paid')

    const payment = fake._all('payments').find(r => r.id === PAYMENT_ID)
    expect(payment?.status).toBe('succeeded')
  })

  it('does not touch the invoice when the payment intent has no linked invoice_id (booking-only payment)', async () => {
    fake._store.set('payments', [
      { id: 'pay-2', tenant_id: TENANT_ID, invoice_id: null, booking_id: 'bk-1', amount_cents: 20000, status: 'succeeded', stripe_payment_intent_id: PI_ID },
    ])
    const res = await postChargeRefunded(20000, 20000)
    expect(res.status).toBe(200)
    expect(postRefundToLedger).toHaveBeenCalled()
    const payment = fake._all('payments').find(r => r.id === 'pay-2')
    expect(payment?.status).toBe('succeeded')
  })
})
