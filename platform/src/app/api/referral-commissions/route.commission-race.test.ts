/**
 * REFERRAL COMMISSION RACE — POST /api/referral-commissions duplicate-insert TOCTOU.
 *
 * The route guards against double-creating a commission for the same
 * booking with a plain `maybeSingle()` existence check before inserting.
 * Two concurrent "create commission" requests for the same booking (double
 * click, or two admins acting on the same booking) can both pass that
 * check before either insert lands. The DB already has a real backstop --
 * `referral_commissions_booking_unique UNIQUE (booking_id)`
 * (019_referral_commissions.sql) -- so no duplicate commission can ever be
 * persisted. But before this fix, the loser's insert threw a raw 23505 up
 * to the generic catch, returning a 500 instead of the same friendly
 * "Commission already exists for this booking" 409 the pre-check returns.
 *
 * This test forces that exact window: the existence check reports nothing
 * yet, but a "concurrent" commission for the same booking lands right
 * before this request's insert.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_ID, BOOKING_ID, REFERRER_ID } = vi.hoisted(() => ({
  TENANT_ID: 'tenant-1',
  BOOKING_ID: 'booking-1',
  REFERRER_ID: 'referrer-1',
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('referral_commissions', 'booking_id')
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, price: 20000, referrer_id: REFERRER_ID, clients: { name: 'Client' } },
  ])
  fake._seed('referrers', [
    { id: REFERRER_ID, tenant_id: TENANT_ID, name: 'Rex', email: 'rex@x.test', commission_rate: 0.1, total_earned: 0 },
  ])
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_ID }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(async () => ({ ok: true })),
  postCommissionPayment: vi.fn(async () => ({ ok: true })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function createRequest(body: Record<string, unknown>) {
  return new Request('http://x/api/referral-commissions', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/referral-commissions — duplicate-commission race', () => {
  it('a concurrent commission landing between the check and the insert returns 409, not 500', async () => {
    // Force the exact race window: the route's pre-check
    // (`.from('referral_commissions')...maybeSingle()`) is the 1st call for
    // this table and must see nothing. Right before the 2nd call (the
    // insert), seed the "concurrent winner" row -- simulating another
    // request's insert landing in the window this check has no lock across.
    let referralCommissionsFromCalls = 0
    const originalFrom = fake.from.bind(fake)
    fake.from = ((table: string) => {
      if (table === 'referral_commissions') {
        referralCommissionsFromCalls++
        if (referralCommissionsFromCalls === 2) {
          fake._seed('referral_commissions', [
            { tenant_id: TENANT_ID, booking_id: BOOKING_ID, referrer_id: REFERRER_ID, status: 'pending' },
          ])
        }
      }
      return originalFrom(table)
    }) as typeof fake.from

    const res = await POST(createRequest({ booking_id: BOOKING_ID }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('Commission already exists for this booking')

    // Only the "concurrent winner" row exists -- the loser's insert never
    // landed a second row for this booking.
    const commissions = fake._all('referral_commissions').filter((c) => c.booking_id === BOOKING_ID)
    expect(commissions.length).toBe(1)
  })
})
