import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * cron/payment-followup-daily's 14-day "recency floor" (never chase ancient
 * bookings) is built by a local `toNaive()` helper reading `Date`'s
 * server-local getters (getFullYear/getMonth/getDate/getHours/...) --
 * server-local is UTC on Vercel, not ET, despite the function's name and the
 * adjacent comment claiming "naive local-ET". bookings.end_time is a real
 * naive-ET TIMESTAMP column. Near the boundary of the 14-day window (any
 * time the true ET wall-clock and the UTC wall-clock land on different
 * calendar days/hours -- i.e. most of every day, not just a midnight edge),
 * the mislabeled-UTC floor is off by the EST/EDT offset (4-5h) from the
 * correct naive-ET floor, and a booking that's genuinely inside the true
 * 14-day chase window can be silently dropped from the daily payment
 * follow-up sweep entirely.
 *
 * Real time in this test: 2026-01-06T04:30:00Z = 11:30pm EST Jan 5, an ET
 * send slot is not required since this test uses `?dry=1` (bypasses the
 * SEND_SLOTS_ET gate).
 */
process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel)
process.env.CRON_SECRET = 'test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x?dry=1', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/payment-followup-daily — naive-ET recency floor, not mislabeled server-local (UTC)', () => {
  beforeEach(() => {
    fake._store.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T04:30:00.000Z')) // 11:30pm EST Jan 5
    fake._seed('tenants', [
      { id: 'tenant-A', name: 'Test Co', status: 'active', telnyx_api_key: 'x', telnyx_phone: '+1', payment_link: 'https://pay.example/x', owner_phone: null, phone: null },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still chases an unpaid completed booking whose naive-ET end_time is inside the true 14-day window, even though it falls in the mislabeled-UTC gap', async () => {
    // True 14-day-ago ET wall-clock is 2025-12-22T23:30:00. The buggy
    // toNaive() read UTC digits off the same real instant instead, landing
    // on 2025-12-23T04:30:00 -- ~5h LATER (more restrictive). This booking's
    // end_time sits inside that gap: truly within the 14-day window, but
    // pre-fix it fell just outside the (wrongly shifted) floor and was
    // silently dropped from the chase sweep.
    // fake-supabase's select() ignores the column-projection string (no
    // embedded-relation support), so it returns rows verbatim -- setting
    // `clients` directly on the booking row stands in for the
    // `clients(name, phone)` embed the real PostgREST select produces.
    fake._seed('bookings', [
      {
        id: 'booking-gap',
        tenant_id: 'tenant-A',
        client_id: 'client-1',
        status: 'completed',
        price: 10000,
        end_time: '2025-12-23T02:00:00',
        payment_status: 'unpaid',
        payment_method: null,
        clients: { name: 'Jane Doe', phone: '+15551234567' },
      },
    ])

    const res = await GET(req())
    const body = await res.json()

    const tenantResult = body.tenants.find((t: { tenant: string }) => t.tenant === 'Test Co')
    expect(tenantResult.wouldText).toBe(1)
  })
})
