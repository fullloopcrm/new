/**
 * createProposalCheckout — the FIRST-INVOICE charge path (platform-billing.ts),
 * P1/W1 queue item (b): a real money-math path with NO prior test coverage.
 *
 * Distinct from syncSubscriptionSeats (ongoing proration, covered in
 * money-math-edge-cases.test.ts). This is what a lead is charged on day one:
 * recurring admin seats + the one-time $25k setup fee on the first invoice,
 * plus optional team seats. The seat-quantity math here is separate code with
 * its OWN clamp rules — and one rule DIVERGES from the sync path (see the
 * "fractional admins" test below), which is the kind of silent asymmetry a
 * characterization test exists to freeze so it can't drift unnoticed.
 *
 * Real code under test; a captured fake Stripe (no network). ensurePlatformPrices
 * is exercised for real — its prices.list is stubbed to return the three
 * expected prices so the find-by-lookup_key path succeeds and any unexpected
 * products/prices.create throws LOUD (lookup_key drift guard).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PRICING } from './billing-pricing'
import {
  PLATFORM_ADMIN_LOOKUP as ADMIN_LOOKUP,
  PLATFORM_MEMBER_LOOKUP as MEMBER_LOOKUP,
  PLATFORM_SETUP_LOOKUP as SETUP_LOOKUP,
} from '@/test/platform-billing-lookup-keys'

// The three lookup_key constants are shared via @/test/platform-billing-lookup-keys
// (imported above, aliased). They mirror platform-billing.ts's module-private
// constants; if those drift, ensurePlatformPrices() won't match a returned price and
// falls to products.create — which throws below, failing loud rather than minting a
// phantom price. Centralized so drift-vs-source is reconciled in one place.

const cap = vi.hoisted(() => ({ sessions: [] as Array<Record<string, unknown>> }))

const fakeStripe = {
  prices: {
    list: () => Promise.resolve({
      data: [
        { id: 'price_admin', lookup_key: ADMIN_LOOKUP },
        { id: 'price_member', lookup_key: MEMBER_LOOKUP },
        { id: 'price_setup', lookup_key: SETUP_LOOKUP },
      ],
    }),
    create: () => { throw new Error('unexpected prices.create — lookup_key drift?') },
  },
  products: { create: () => { throw new Error('unexpected products.create — lookup_key drift?') } },
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
const lineFor = (priceId: string) => lines().find((l) => l.price === priceId)

async function checkout(over: Partial<Parameters<typeof createProposalCheckout>[0]> = {}) {
  return createProposalCheckout({
    leadId: 'lead-1', email: 'buyer@example.com', admins: 2, teamMembers: 1,
    origin: 'https://app.test', ...over,
  })
}

beforeEach(() => { cap.sessions = [] })

describe('createProposalCheckout — first-invoice line items (recurring seats + one-time setup)', () => {
  it('builds admin + setup + team lines with the right prices and quantities', async () => {
    await checkout({ admins: 3, teamMembers: 2 })
    expect(lineFor('price_admin')).toEqual({ price: 'price_admin', quantity: 3 })
    expect(lineFor('price_setup')).toEqual({ price: 'price_setup', quantity: 1 })
    expect(lineFor('price_member')).toEqual({ price: 'price_member', quantity: 2 })
  })

  it('always bills exactly ONE setup fee, regardless of seat counts (the one-time $25k on the first invoice)', async () => {
    await checkout({ admins: 9, teamMembers: 4 })
    expect(lineFor('price_setup')).toEqual({ price: 'price_setup', quantity: 1 })
    // sanity: the setup price maps to PRICING.setupFee ($25,000) upstream in ensurePlatformPrices
    expect(PRICING.setupFee).toBe(25000)
  })

  it('clamps admin seats to a minimum of 1 (a proposal cannot be billed 0 admins)', async () => {
    await checkout({ admins: 0, teamMembers: 0 })
    expect(lineFor('price_admin')).toEqual({ price: 'price_admin', quantity: 1 })
  })

  it('omits the team line entirely when teamMembers is 0 (no phantom $0/qty-0 team seat)', async () => {
    await checkout({ admins: 2, teamMembers: 0 })
    expect(lineFor('price_member')).toBeUndefined()
    // exactly admin + setup, nothing else
    expect(lines()).toHaveLength(2)
  })

  it('omits the team line when teamMembers is negative (> 0 guard, not >= 0)', async () => {
    await checkout({ admins: 1, teamMembers: -3 })
    expect(lineFor('price_member')).toBeUndefined()
  })

  it('CHARACTERIZATION + FLAG: does NOT floor fractional admins — diverges from syncSubscriptionSeats', async () => {
    // syncSubscriptionSeats uses Math.floor(admins) (see money-math-edge-cases:
    // "clamps admin seats to a minimum of 1 and floors fractional counts").
    // createProposalCheckout uses only Math.max(1, opts.admins) — NO floor — so a
    // fractional seat count is passed straight to Stripe. Stripe's API rejects
    // non-integer quantities, so in practice this path would 400 at checkout for a
    // fractional admins value. Pinned here as current behavior + a flag, NOT an
    // assertion that it is correct. Fix (if desired): Math.max(1, Math.floor(admins))
    // to match the sync path. Callers today pass integers, so it is latent, not live.
    await checkout({ admins: 2.9, teamMembers: 0 })
    expect(lineFor('price_admin')).toEqual({ price: 'price_admin', quantity: 2.9 })
  })

  it('runs in subscription mode with ACH offered before card (avoids the card fee on the $25k setup)', async () => {
    await checkout()
    expect(cap.sessions[0].mode).toBe('subscription')
    // us_bank_account (ACH) is listed first — per the module docstring, ACH avoids
    // the ~$725 card fee on the one-time $25k setup.
    expect(cap.sessions[0].payment_method_types).toEqual(['us_bank_account', 'card'])
  })

  it('tags the session + subscription with the lead id, and returns the hosted url + id', async () => {
    const res = await checkout({ leadId: 'lead-XYZ' })
    expect(cap.sessions[0].metadata).toMatchObject({ lead_id: 'lead-XYZ', kind: 'platform_proposal' })
    expect(cap.sessions[0].subscription_data).toEqual({ metadata: { lead_id: 'lead-XYZ' } })
    expect(res).toEqual({ url: 'https://checkout.stripe.test/cs_test_1', id: 'cs_test_1' })
  })

  it('includes customer_email only when an email is supplied', async () => {
    await checkout({ email: 'given@example.com' })
    expect(cap.sessions[0].customer_email).toBe('given@example.com')

    cap.sessions = []
    await checkout({ email: null })
    expect('customer_email' in cap.sessions[0]).toBe(false)
  })
})
