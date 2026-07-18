import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/**
 * PATCH /api/admin/prospects/[id] action=approve — idx_prospects_trade_zip_active
 * partial-uniques (trade, primary_zip) across approved/paid rows, a real
 * territory-exclusivity guarantee. Two qualifying prospects for the same
 * trade+zip applying around the same time is a normal occurrence: approving the
 * second one after the first already holds the slot must surface as a clear
 * conflict.
 *
 * Pre-fix, this whole handler had NO try/catch anywhere, so the update's 23505
 * hit a bare `throw error` that propagated fully uncaught out of the route --
 * not a JSON 500, an unhandled exception -- with the Stripe checkout session
 * for this prospect already created (a real API call) and its URL silently
 * discarded.
 */

const h = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  sessionsCreate: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))
vi.mock('@/lib/platform-billing', () => ({
  ensurePlatformPrices: async () => ({ adminPriceId: 'price_admin', memberPriceId: 'price_member' }),
}))
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: (...a: unknown[]) => h.sessionsCreate(...a) } }
  },
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => h.select() }) }),
      update: (updates: Record<string, unknown>) => ({
        eq: () => ({ select: () => ({ single: () => h.update(updates) }) }),
      }),
    }),
  },
}))

import { PATCH } from './route'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = { params: Promise.resolve({ id: 'prospect-B' }) }

beforeEach(() => {
  h.requireAdmin.mockReset().mockResolvedValue(null)
  h.sessionsCreate.mockReset().mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/cs_test_123' })
  h.select.mockReset().mockResolvedValue({
    data: { id: 'prospect-B', owner_email: 'b@example.com', trade: 'plumbing', primary_zip: '10001' },
    error: null,
  })
  h.update.mockReset()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
})

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY
})

describe('PATCH /api/admin/prospects/[id] action=approve — trade+zip slot collision', () => {
  it('returns a clean 409 (not an uncaught throw) when the slot is already taken', async () => {
    h.update.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "idx_prospects_trade_zip_active"', code: '23505' },
    })

    const res = await PATCH(patchReq({ action: 'approve' }), params)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already holds the exclusive slot/i)
    // The Stripe session was still created (can't be un-created after the fact) —
    // but the DB write correctly never landed a second 'approved' row.
    expect(h.sessionsCreate).toHaveBeenCalledTimes(1)
  })

  it('still approves normally when no slot conflict exists', async () => {
    h.update.mockResolvedValue({
      data: { id: 'prospect-B', status: 'approved', stripe_checkout_url: 'https://checkout.stripe.com/cs_test_123' },
      error: null,
    })

    const res = await PATCH(patchReq({ action: 'approve' }), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.prospect.status).toBe('approved')
  })

  it('surfaces a plain 500 for an unrelated DB error rather than the 409 message', async () => {
    h.update.mockResolvedValue({ data: null, error: { message: 'connection reset', code: '08006' } })

    const res = await PATCH(patchReq({ action: 'approve' }), params)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('connection reset')
  })
})
