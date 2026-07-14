/**
 * ensurePlatformPrices — the find-OR-CREATE price minting path (platform-billing.ts),
 * P1/W1 16:43 queue item c: a real money path with NO prior coverage.
 *
 * Every OTHER test in the suite stubs `stripe.prices.list` to return all three
 * prices, so ensurePlatformPrices always takes the "found" branch and the CREATE
 * branch — what actually runs the first time, before any price exists in the Stripe
 * account — has never been exercised. That branch carries the load-bearing
 * dollars->cents conversion (`unit_amount = PRICING.x * 100`) and the recurring vs
 * one-time interval choice. A missing `* 100` would mint the $25,000 setup fee at
 * $250; billing the one-time setup as `recurring` would charge $25k every month.
 * This pins the created price shapes so those money bugs can't ship silently.
 *
 * Real code under test; a captured fake Stripe (no network) whose prices.list
 * returns a controllable subset, so each per-price find-vs-create branch is reachable.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PRICING } from './billing-pricing'
import {
  PLATFORM_ADMIN_LOOKUP,
  PLATFORM_MEMBER_LOOKUP,
  PLATFORM_SETUP_LOOKUP,
} from '@/test/platform-billing-lookup-keys'

type CreatedPrice = {
  product: string
  currency: string
  unit_amount: number
  recurring?: { interval: string }
  lookup_key: string
}

const cap = vi.hoisted(() => ({
  existing: [] as Array<{ id: string; lookup_key: string }>,
  productNames: [] as string[],
  createdPrices: [] as CreatedPrice[],
}))

// prices.list returns a CONTROLLABLE subset (cap.existing) so the find-vs-create
// branch per price is reachable; create captures its params and returns a
// deterministic id (`price_<lookup_key>`) so the returned ids are assertable.
const fakeStripe = {
  prices: {
    list: () => Promise.resolve({ data: cap.existing }),
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
}
vi.mock('./stripe', () => ({ getStripe: () => fakeStripe }))

import { ensurePlatformPrices } from './platform-billing'

const createdByLookup = (k: string) => cap.createdPrices.find((p) => p.lookup_key === k)

beforeEach(() => {
  cap.existing = []
  cap.productNames = []
  cap.createdPrices = []
})

describe('ensurePlatformPrices — CREATE branch mints prices at the correct amount + interval (never covered before)', () => {
  it('mints all three prices when none exist, each at PRICING.* dollars converted to cents (*100)', async () => {
    const res = await ensurePlatformPrices()

    expect(createdByLookup(PLATFORM_ADMIN_LOOKUP)?.unit_amount).toBe(PRICING.adminMonthly * 100)       // 2500 -> 250000
    expect(createdByLookup(PLATFORM_MEMBER_LOOKUP)?.unit_amount).toBe(PRICING.teamMemberMonthly * 100) // 250 -> 25000
    expect(createdByLookup(PLATFORM_SETUP_LOOKUP)?.unit_amount).toBe(PRICING.setupFee * 100)           // 25000 -> 2500000

    for (const k of [PLATFORM_ADMIN_LOOKUP, PLATFORM_MEMBER_LOOKUP, PLATFORM_SETUP_LOOKUP]) {
      expect(createdByLookup(k)?.currency).toBe('usd')
    }

    // returns the ids of the freshly-created prices
    expect(res).toEqual({
      adminPriceId: `price_${PLATFORM_ADMIN_LOOKUP}`,
      memberPriceId: `price_${PLATFORM_MEMBER_LOOKUP}`,
      setupPriceId: `price_${PLATFORM_SETUP_LOOKUP}`,
    })
  })

  it('admin + member seats are RECURRING monthly; the setup fee is ONE-TIME (no recurring) — the interval money-bug guard', async () => {
    await ensurePlatformPrices()
    expect(createdByLookup(PLATFORM_ADMIN_LOOKUP)?.recurring).toEqual({ interval: 'month' })
    expect(createdByLookup(PLATFORM_MEMBER_LOOKUP)?.recurring).toEqual({ interval: 'month' })
    // The setup fee must NOT be recurring — a monthly $25k setup charge is catastrophic.
    const setup = createdByLookup(PLATFORM_SETUP_LOOKUP)
    expect(setup).toBeDefined()
    expect(setup).not.toHaveProperty('recurring')
  })

  it('the $25,000 setup fee mints at 2,500,000 cents, not $250 — the missing-*100 guard', async () => {
    await ensurePlatformPrices()
    expect(PRICING.setupFee).toBe(25000)
    expect(createdByLookup(PLATFORM_SETUP_LOOKUP)?.unit_amount).toBe(2_500_000)
  })

  it('find-OR-create is PER price: an already-existing admin price is reused, only the missing two are created', async () => {
    cap.existing = [{ id: 'price_admin_existing', lookup_key: PLATFORM_ADMIN_LOOKUP }]
    const res = await ensurePlatformPrices()

    expect(createdByLookup(PLATFORM_ADMIN_LOOKUP)).toBeUndefined() // reused, not created
    expect(createdByLookup(PLATFORM_MEMBER_LOOKUP)).toBeDefined()
    expect(createdByLookup(PLATFORM_SETUP_LOOKUP)).toBeDefined()

    expect(res.adminPriceId).toBe('price_admin_existing') // the found id, not a minted one
    expect(res.memberPriceId).toBe(`price_${PLATFORM_MEMBER_LOOKUP}`)
    expect(res.setupPriceId).toBe(`price_${PLATFORM_SETUP_LOOKUP}`)

    // only two products created — the admin product was never touched
    expect(cap.productNames).toHaveLength(2)
  })

  it('names each created product for the Stripe dashboard', async () => {
    await ensurePlatformPrices()
    expect(cap.productNames).toContain('Full Loop — Admin seat')
    expect(cap.productNames).toContain('Full Loop — Portal team seat')
    expect(cap.productNames).toContain('Full Loop — Setup fee (one-time)')
  })
})
