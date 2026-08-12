/**
 * POST /api/referral-commissions — the duplicate-commission guard fails open
 * on an unchecked query error.
 *
 * `const { data: existing } = await ...maybeSingle()` never looked at
 * `error`. On a transient DB error, Supabase returns `data: null` exactly
 * like "no existing commission found" — so the route would sail past the
 * guard and create a commission even though it has no idea whether one
 * already exists for this booking. Fixed by checking `error` explicitly and
 * failing closed (500, no insert attempted) instead of guessing "clear".
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const t = vi.hoisted(() => ({ tenantId: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { makeLedgerSupabaseFake } = await import('@/test/ledger-supabase-fake')
  const fake = makeLedgerSupabaseFake(h)
  return { supabaseAdmin: fake, supabase: fake, __fakeBase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: () => Promise.resolve({ tenantId: t.tenantId, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(() => Promise.resolve({ posted: true })),
  postCommissionPayment: vi.fn(() => Promise.resolve({ posted: true })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  t.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'booking-1', tenant_id: 'tenant-A', price: 10000, referrer_id: 'referrer-1', clients: { name: 'Jane' } },
    ],
    referrers: [
      { id: 'referrer-1', tenant_id: 'tenant-A', name: 'Ref Co', email: null, commission_rate: 0.10, total_earned: 0, total_paid: 0 },
    ],
    referral_commissions: [],
  }
})

describe('POST /api/referral-commissions — duplicate-check query error', () => {
  it('fails closed (500) instead of creating a commission when the existence check errors', async () => {
    // Force the exact query the route can't currently distinguish from "no
    // row found": intercept the first `.from('referral_commissions')` call
    // (the duplicate-check `maybeSingle()`) and hand back a DB error instead
    // of `{ data: null, error: null }`.
    const fakeSupabase = supabaseAdmin as unknown as {
      from: (table: string) => { select: () => { eq: () => { eq: () => { maybeSingle: () => Promise<unknown> } } } }
    }
    const originalFrom = fakeSupabase.from.bind(fakeSupabase)
    let referralCommissionsCalls = 0
    fakeSupabase.from = ((table: string) => {
      if (table === 'referral_commissions') {
        referralCommissionsCalls++
        if (referralCommissionsCalls === 1) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: { message: 'connection reset by peer' } }),
                }),
              }),
            }),
          }
        }
      }
      return originalFrom(table)
    }) as typeof fakeSupabase.from

    const res = await POST(postReq({ booking_id: 'booking-1' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/failed to verify existing commission/i)
    // No commission was created and the referrer's total_earned was never
    // touched -- the route must not proceed past an unverified duplicate check.
    expect(h.store.referral_commissions).toHaveLength(0)
    expect(h.store.referrers[0].total_earned).toBe(0)
  })
})
