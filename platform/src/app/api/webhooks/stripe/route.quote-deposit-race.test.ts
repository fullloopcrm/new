import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Double-post regression for the quote-deposit branch of
 * checkout.session.completed. The guard was SELECT deposit_paid_at, check
 * it's null, THEN a plain UPDATE with no matching WHERE guard — two
 * concurrent deliveries can both pass the SELECT before either UPDATE
 * commits, so both proceed to post the deposit to the ledger, advance the
 * deal to Sold twice, and call convertSaleToJob twice. Fix: fold the
 * IS NULL check into the UPDATE itself (compare-and-swap) so only the
 * winning delivery gets a row back; the loser must stop cold.
 *
 * This forces that loser outcome directly (the update returns no row, as it
 * would once another delivery's UPDATE already flipped deposit_paid_at) and
 * asserts nothing downstream fires a second time.
 */

const TENANT = 'tenant-a'
const QUOTE = 'quote-1'

const { convertSaleToJob, postDepositToLedger } = vi.hoisted(() => ({
  convertSaleToJob: vi.fn(async () => ({ jobId: 'job-should-never-happen' })),
  postDepositToLedger: vi.fn(async () => ({ posted: true })),
}))

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
  }
  return { default: MockStripe }
})

function chain(table: string) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    is: () => c,
    limit: () => c,
    maybeSingle: async () => {
      if (table === 'quotes') {
        return {
          data: { id: QUOTE, deal_id: null, deposit_paid_at: null, deposit_cents: 5000, quote_number: 'Q-1' },
          error: null,
        }
      }
      return { data: null, error: null }
    },
    update: (payload: Record<string, unknown>) => ({
      eq: () => ({
        eq: () => ({
          is: () => ({
            // The loser of the race: another delivery already flipped
            // deposit_paid_at, so the IS NULL guard matches zero rows.
            select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      }),
    }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger,
  postRefundToLedger: vi.fn(async () => ({ posted: true })),
  postChargebackToLedger: vi.fn(async () => ({ posted: true })),
  tenantFromPaymentIntent: vi.fn(async () => null),
}))
vi.mock('@/lib/jobs', () => ({ convertSaleToJob }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

import { POST } from './route'

function depositEvent() {
  const session = {
    id: 'cs_deposit_race',
    amount_total: 5000,
    payment_intent: 'pi_deposit_race',
    client_reference_id: null,
    customer_details: {},
    metadata: { quote_deposit: 'true', quote_id: QUOTE, tenant_id: TENANT },
  }
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }),
  })
}

beforeEach(() => {
  convertSaleToJob.mockClear()
  postDepositToLedger.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe — quote deposit claim race', () => {
  it('stops before posting the ledger / creating the job when the claim UPDATE matches no row', async () => {
    const res = await POST(depositEvent())
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ received: true, idempotent: true })

    expect(postDepositToLedger).not.toHaveBeenCalled()
    expect(convertSaleToJob).not.toHaveBeenCalled()
  })
})
