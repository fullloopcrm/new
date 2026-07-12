/**
 * Seat-quantity DIVERGENCE between the two platform-billing seat paths
 * (P1/W1 16:43 queue item b). createProposalCheckout (the first-invoice charge)
 * and syncSubscriptionSeats (the ongoing seat sync) both turn a seat COUNT into
 * a Stripe line quantity — but they clamp DIFFERENTLY:
 *
 *   syncSubscriptionSeats:  Math.max(1, Math.floor(admins || 0))   -> FLOORS
 *   createProposalCheckout: Math.max(1, opts.admins)               -> NO floor
 *
 * Stripe line-item quantities must be non-negative integers; a fractional
 * quantity is rejected with a 400 at checkout/subscription create. So for the
 * SAME fractional input the two paths diverge: the sync path emits a safe
 * integer, the checkout path emits a fractional quantity that would 400. This
 * test pins that asymmetry in ONE place — both real functions, same input — so
 * the gap is legible and can't drift silently.
 *
 * It is LATENT today: every caller passes integer seat counts, so nothing 400s
 * in practice. This freezes the divergence as current behavior + a flag, NOT an
 * endorsement that the checkout path is correct. Fix (if desired):
 * Math.max(1, Math.floor(opts.admins)) in createProposalCheckout to match sync.
 *
 * Distinct from platform-billing-checkout.test.ts (single-path characterization
 * of the checkout admin line) and money-math-edge-cases.test.ts (single-path
 * proration seat math): this file asserts the CROSS-path divergence + Stripe
 * integer-validity, which neither of those does.
 *
 * Real code under test; a captured fake Stripe (no network) exposing both the
 * checkout.sessions and subscriptions surfaces.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PLATFORM_ADMIN_LOOKUP,
  PLATFORM_MEMBER_LOOKUP,
  PLATFORM_SETUP_LOOKUP,
} from '@/test/platform-billing-lookup-keys'

const cap = vi.hoisted(() => ({
  sessions: [] as Array<Record<string, unknown>>,
  subUpdates: [] as Array<{ id: string; params: Record<string, unknown> }>,
  sub: { items: { data: [] as Array<{ id: string; price: { id: string } }> } },
}))

// Both platform prices are found (so ensurePlatformPrices resolves), and any
// unexpected create throws (lookup_key drift guard). Adds BOTH the checkout and
// subscriptions surfaces so the two seat paths can be exercised side by side.
const fakeStripe = {
  prices: {
    list: () => Promise.resolve({
      data: [
        { id: 'price_admin', lookup_key: PLATFORM_ADMIN_LOOKUP },
        { id: 'price_member', lookup_key: PLATFORM_MEMBER_LOOKUP },
        { id: 'price_setup', lookup_key: PLATFORM_SETUP_LOOKUP },
      ],
    }),
    create: () => { throw new Error('unexpected prices.create — lookup_key drift?') },
  },
  products: { create: () => { throw new Error('unexpected products.create — lookup_key drift?') } },
  checkout: {
    sessions: {
      create: (params: Record<string, unknown>) => {
        cap.sessions.push(params)
        return Promise.resolve({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' })
      },
    },
  },
  subscriptions: {
    retrieve: () => Promise.resolve(cap.sub),
    update: (id: string, params: Record<string, unknown>) => {
      cap.subUpdates.push({ id, params })
      return Promise.resolve({})
    },
  },
}
vi.mock('./stripe', () => ({ getStripe: () => fakeStripe }))

import { createProposalCheckout, syncSubscriptionSeats } from './platform-billing'

type Line = { price?: string; id?: string; quantity?: number; deleted?: boolean }

/** Stripe rejects a non-integer or <1 quantity on a required line with a 400. */
const isStripeValidRequiredQty = (q: unknown): boolean =>
  typeof q === 'number' && Number.isInteger(q) && q >= 1

const FRACTIONAL_ADMINS = 2.9
const FRACTIONAL_TEAM = 1.5

/** Run createProposalCheckout and return the seat quantities it feeds Stripe. */
async function checkoutQtys(admins: number, teamMembers: number) {
  cap.sessions = []
  await createProposalCheckout({ leadId: 'lead-1', email: null, admins, teamMembers, origin: 'https://app.test' })
  const lines = cap.sessions[0].line_items as Line[]
  return {
    admin: lines.find((l) => l.price === 'price_admin')!.quantity,
    team: lines.find((l) => l.price === 'price_member')?.quantity,
  }
}

/** Run syncSubscriptionSeats (empty sub -> all new lines) and return its quantities. */
async function syncQtys(admins: number, teamMembers: number) {
  cap.subUpdates = []
  cap.sub = { items: { data: [] } }
  await syncSubscriptionSeats('sub_1', admins, teamMembers)
  const items = cap.subUpdates[0].params.items as Line[]
  return {
    admin: items.find((l) => l.price === 'price_admin')!.quantity,
    team: items.find((l) => l.price === 'price_member')?.quantity,
  }
}

beforeEach(() => {
  cap.sessions = []
  cap.subUpdates = []
  cap.sub = { items: { data: [] } }
})

describe('seat-quantity divergence — checkout does NOT floor, sync DOES (same fractional input)', () => {
  it('checkout emits the fractional ADMIN quantity verbatim (Math.max(1,x), no floor)', async () => {
    const { admin } = await checkoutQtys(FRACTIONAL_ADMINS, FRACTIONAL_TEAM)
    expect(admin).toBe(2.9)
  })

  it('checkout emits the fractional TEAM quantity too (opts.teamMembers, also unfloored)', async () => {
    const { team } = await checkoutQtys(FRACTIONAL_ADMINS, FRACTIONAL_TEAM)
    expect(team).toBe(1.5)
  })

  it('sync FLOORS both seat counts to safe integers for the SAME input (Math.floor)', async () => {
    const { admin, team } = await syncQtys(FRACTIONAL_ADMINS, FRACTIONAL_TEAM)
    expect(admin).toBe(2) // floor(2.9)
    expect(team).toBe(1)  // floor(1.5)
  })

  it('THE DIVERGENCE: identical seat counts produce DIFFERENT quantities on the two paths', async () => {
    const checkout = await checkoutQtys(FRACTIONAL_ADMINS, FRACTIONAL_TEAM)
    const sync = await syncQtys(FRACTIONAL_ADMINS, FRACTIONAL_TEAM)
    expect(checkout.admin).not.toBe(sync.admin) // 2.9 vs 2
    expect(checkout.team).not.toBe(sync.team)   // 1.5 vs 1
  })

  it('LATENT 400: the checkout admin quantity is not a valid Stripe integer quantity; the sync one is', async () => {
    const checkout = await checkoutQtys(FRACTIONAL_ADMINS, FRACTIONAL_TEAM)
    const sync = await syncQtys(FRACTIONAL_ADMINS, FRACTIONAL_TEAM)
    // A fractional required-line quantity 400s at Stripe checkout create.
    expect(isStripeValidRequiredQty(checkout.admin)).toBe(false) // would 400
    expect(isStripeValidRequiredQty(sync.admin)).toBe(true)      // safe
  })

  it('INTEGER inputs pass BOTH paths identically — the divergence is latent, only fractional inputs expose it', async () => {
    const checkout = await checkoutQtys(3, 2)
    const sync = await syncQtys(3, 2)
    expect(checkout.admin).toBe(3)
    expect(sync.admin).toBe(3)
    expect(checkout.admin).toBe(sync.admin) // identical for integer inputs
    expect(isStripeValidRequiredQty(checkout.admin)).toBe(true)
  })
})
