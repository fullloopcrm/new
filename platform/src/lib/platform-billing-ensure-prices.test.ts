/**
 * ensurePlatformMonthlyPrice + ensureFirstMonthCoupon — the find-OR-CREATE
 * paths for flat platform pricing (platform-billing.ts, 2026-08-02 rewrite).
 *
 * Every OTHER test in the suite stubs the "found" branch, so the CREATE
 * branch — what actually runs the first time, before the price/coupon exists
 * in the Stripe account — needs its own coverage. It carries the load-bearing
 * dollars->cents conversion (`unit_amount = PRICING.monthlyFee * 100`) and the
 * coupon math that brings the first invoice down to exactly $1
 * (`amount_off = monthlyFee*100 - 100`). A missing `* 100` would mint the
 * $2,500/mo price at $25; a wrong amount_off would make the "verification"
 * charge $0 or negative.
 *
 * Real code under test; a captured fake Stripe (no network) whose prices.list
 * / coupons.retrieve return a controllable state, so both the find and create
 * branches are reachable for each function independently.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PRICING } from './billing-pricing'

const MONTHLY_LOOKUP = 'fl_flat_monthly_2500'
const FIRST_MONTH_COUPON_ID = 'fl_first_month_1_dollar_2500'

type CreatedPrice = {
  product: string
  currency: string
  unit_amount: number
  recurring?: { interval: string }
  lookup_key: string
}
type CreatedCoupon = {
  id: string
  amount_off: number
  currency: string
  duration: string
  name: string
}

const cap = vi.hoisted(() => ({
  existingPrice: null as { id: string; lookup_key: string } | null,
  existingCoupon: null as { id: string; deleted?: boolean } | null,
  productNames: [] as string[],
  createdPrices: [] as CreatedPrice[],
  createdCoupons: [] as CreatedCoupon[],
}))

const fakeStripe = {
  prices: {
    list: () => Promise.resolve({ data: cap.existingPrice ? [cap.existingPrice] : [] }),
    create: (params: CreatedPrice) => {
      cap.createdPrices.push(params)
      return Promise.resolve({ id: `price_${params.lookup_key}`, ...params })
    },
  },
  products: {
    create: (params: { name: string }) => {
      cap.productNames.push(params.name)
      return Promise.resolve({ id: `prod_${cap.productNames.length}` })
    },
  },
  coupons: {
    retrieve: () => {
      if (cap.existingCoupon) return Promise.resolve(cap.existingCoupon)
      return Promise.reject(new Error('No such coupon'))
    },
    create: (params: CreatedCoupon) => {
      cap.createdCoupons.push(params)
      return Promise.resolve({ ...params })
    },
  },
}
vi.mock('./stripe', () => ({ getStripe: () => fakeStripe }))

import { ensurePlatformMonthlyPrice, ensureFirstMonthCoupon } from './platform-billing'

const createdMonthlyPrice = () => cap.createdPrices.find((p) => p.lookup_key === MONTHLY_LOOKUP)
const createdCoupon = () => cap.createdCoupons.find((c) => c.id === FIRST_MONTH_COUPON_ID)

beforeEach(() => {
  cap.existingPrice = null
  cap.existingCoupon = null
  cap.productNames = []
  cap.createdPrices = []
  cap.createdCoupons = []
})

describe('ensurePlatformMonthlyPrice', () => {
  it('mints the flat monthly price when none exists, at PRICING.monthlyFee dollars converted to cents (*100)', async () => {
    const id = await ensurePlatformMonthlyPrice()
    expect(createdMonthlyPrice()?.unit_amount).toBe(PRICING.monthlyFee * 100) // 2500 -> 250000
    expect(createdMonthlyPrice()?.currency).toBe('usd')
    expect(id).toBe(`price_${MONTHLY_LOOKUP}`)
  })

  it('the price is RECURRING monthly, not one-time', async () => {
    await ensurePlatformMonthlyPrice()
    expect(createdMonthlyPrice()?.recurring).toEqual({ interval: 'month' })
  })

  it('names the created product for the Stripe dashboard', async () => {
    await ensurePlatformMonthlyPrice()
    expect(cap.productNames).toContain('Full Loop CRM — monthly (flat, unlimited)')
  })

  it('reuses an existing price by lookup_key instead of minting a new one', async () => {
    cap.existingPrice = { id: 'price_existing', lookup_key: MONTHLY_LOOKUP }
    const id = await ensurePlatformMonthlyPrice()
    expect(id).toBe('price_existing')
    expect(createdMonthlyPrice()).toBeUndefined()
    expect(cap.productNames).toHaveLength(0)
  })
})

describe('ensureFirstMonthCoupon', () => {
  it('mints a $1-first-month coupon when none exists: amount_off brings $2,500 down to exactly $1', async () => {
    const id = await ensureFirstMonthCoupon()
    // The missing-*100 / off-by-one guard: 250000 - 100 = 249900, i.e. a $2,499 discount
    // leaving a $1 (100-cent) first charge — not $0, not negative.
    expect(createdCoupon()?.amount_off).toBe(PRICING.monthlyFee * 100 - 100)
    expect(createdCoupon()?.amount_off).toBe(249_900)
    expect(id).toBe(FIRST_MONTH_COUPON_ID)
  })

  it('the coupon applies ONCE, not forever — every invoice after month one is full price', async () => {
    await ensureFirstMonthCoupon()
    expect(createdCoupon()?.duration).toBe('once')
  })

  it('reuses an existing, non-deleted coupon instead of minting a new one', async () => {
    cap.existingCoupon = { id: FIRST_MONTH_COUPON_ID, deleted: false }
    const id = await ensureFirstMonthCoupon()
    expect(id).toBe(FIRST_MONTH_COUPON_ID)
    expect(createdCoupon()).toBeUndefined()
  })

  it('re-creates when the existing coupon was deleted in Stripe', async () => {
    cap.existingCoupon = { id: FIRST_MONTH_COUPON_ID, deleted: true }
    const id = await ensureFirstMonthCoupon()
    expect(id).toBe(FIRST_MONTH_COUPON_ID)
    expect(createdCoupon()).toBeDefined()
  })
})
