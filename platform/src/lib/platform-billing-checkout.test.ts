/**
 * createProposalCheckout — the RECURRING-ONLY checkout path (platform-billing.ts),
 * P1/W1 queue item (b): a real money-math path with test coverage.
 *
 * Flat pricing (2026-08-02): the $25,000 setup fee moved off Stripe onto a bank
 * wire (tracked separately, confirmed via requests/[id]/wire-received) — it is
 * NEVER a line item here. This checkout is exactly one flat $2,500/mo line item
 * with a one-time $1-first-month coupon applied via `discounts`. No admin/team
 * seat params exist anymore; unlimited headcount doesn't change the price.
 *
 * Real code under test; a captured fake Stripe (no network). ensurePlatformMonthlyPrice
 * and ensureFirstMonthCoupon are exercised for real — prices.list / coupons.retrieve
 * are stubbed to return the expected existing price/coupon so the find path succeeds,
 * and any unexpected products/prices/coupons.create throws LOUD (lookup_key/id drift
 * guard).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PRICING } from './billing-pricing'

const MONTHLY_LOOKUP = 'fl_flat_monthly_2500'
const FIRST_MONTH_COUPON_ID = 'fl_first_month_1_dollar_2500'

const cap = vi.hoisted(() => ({ sessions: [] as Array<Record<string, unknown>> }))

const fakeStripe = {
  prices: {
    list: () => Promise.resolve({ data: [{ id: 'price_monthly', lookup_key: MONTHLY_LOOKUP }] }),
    create: () => { throw new Error('unexpected prices.create — lookup_key drift?') },
  },
  products: { create: () => { throw new Error('unexpected products.create — lookup_key drift?') } },
  coupons: {
    retrieve: () => Promise.resolve({ id: FIRST_MONTH_COUPON_ID, deleted: false }),
    create: () => { throw new Error('unexpected coupons.create — coupon id drift?') },
  },
  checkout: {
    sessions: {
      create: (params: Record<string, unknown>) => {
        cap.sessions.push(params)
        return Promise.resolve({ id: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' })
      },
    },
  },
}
vi.mock('./stripe', () => ({ getStripe: () => fakeStripe }))

import { createProposalCheckout } from './platform-billing'

type Line = { price: string; quantity: number }
const lines = () => cap.sessions[0].line_items as Line[]

async function checkout(over: Partial<Parameters<typeof createProposalCheckout>[0]> = {}) {
  return createProposalCheckout({
    leadId: 'lead-1', email: 'buyer@example.com',
    origin: 'https://app.test', ...over,
  })
}

beforeEach(() => { cap.sessions = [] })

describe('createProposalCheckout — flat monthly line item + $1 first-month coupon', () => {
  it('builds exactly one line item: the flat monthly price at quantity 1', async () => {
    await checkout()
    expect(lines()).toEqual([{ price: 'price_monthly', quantity: 1 }])
  })

  it('never includes a setup-fee line item — the $25k is a bank wire, not a Stripe charge', async () => {
    await checkout()
    expect(lines()).toHaveLength(1)
    expect(PRICING.setupFee).toBe(25000) // sanity: setup fee still exists as a concept, just not here
  })

  it('applies the $1-first-month coupon as a discount, not baked into the line item', async () => {
    await checkout()
    expect(cap.sessions[0].discounts).toEqual([{ coupon: FIRST_MONTH_COUPON_ID }])
  })

  it('runs in subscription mode with card offered before ACH', async () => {
    await checkout()
    expect(cap.sessions[0].mode).toBe('subscription')
    expect(cap.sessions[0].payment_method_types).toEqual(['card', 'us_bank_account'])
  })

  it('tags the session + subscription with the lead id, and returns the hosted url + id', async () => {
    const res = await checkout({ leadId: 'lead-XYZ' })
    expect(cap.sessions[0].metadata).toMatchObject({ lead_id: 'lead-XYZ', kind: 'platform_proposal' })
    expect(cap.sessions[0].subscription_data).toEqual({ metadata: { lead_id: 'lead-XYZ' } })
    expect(res).toEqual({ url: 'https://checkout.stripe.test/cs_test_1', id: 'cs_test_1' })
  })

  it('success_url carries the lead id so the thank-you page can render wire instructions', async () => {
    await checkout({ leadId: 'lead-XYZ', origin: 'https://app.test' })
    expect(cap.sessions[0].success_url).toBe('https://app.test/proposal/thank-you?lead=lead-XYZ')
  })

  it('includes customer_email only when an email is supplied', async () => {
    await checkout({ email: 'given@example.com' })
    expect(cap.sessions[0].customer_email).toBe('given@example.com')

    cap.sessions = []
    await checkout({ email: null })
    expect('customer_email' in cap.sessions[0]).toBe(false)
  })
})
