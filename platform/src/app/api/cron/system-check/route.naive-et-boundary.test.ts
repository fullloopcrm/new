import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * bookings.start_time/end_time are naive-ET TIMESTAMP columns (no tz) --
 * literally the ET wall-clock digits. The "Booking Pipeline" and "Payment
 * Pipeline" checks built their boundaries with real `Date.now()` /
 * `new Date().toISOString()` -- a real-UTC instant -- then compared it
 * directly against those naive-ET columns. During the ~8pm-midnight ET
 * window (UTC already rolled to the next calendar day, ET hasn't), this
 * mismatch is off by the whole EST/EDT offset (4-5h): a booking that is
 * genuinely stuck/overdue in ET terms falls outside the computed window,
 * or vice versa.
 *
 * Real time in this test: 2026-01-06T04:30:00Z = 11:30pm EST Jan 5.
 */
process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel)
process.env.CRON_SECRET = 'test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => ({ ok: true, status: 200, body: '' })) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/system-check — naive-ET boundary, not real-UTC instant', () => {
  beforeEach(() => {
    fake._store.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T04:30:00.000Z')) // 11:30pm EST Jan 5
    fake._seed('tenants', [
      { id: 'tenant-A', name: 'Test Co', status: 'active', resend_api_key: 'x', telnyx_api_key: 'x', telnyx_phone: '+1', stripe_api_key: 'x' },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('flags a booking as stuck in_progress once its naive-ET end_time is >4h ago, not >4h-minus-the-ET-offset ago', async () => {
    // end_time is 3.5h before "now" in real elapsed time, so it should NOT
    // be flagged yet. Pre-fix, the fourHoursAgo boundary was shifted by the
    // EST offset (-5h) when compared against this naive-ET column, so a
    // booking only 3.5h stale looked like it ended "before" the (wrongly
    // shifted) cutoff and was flagged early -- or the reverse, depending on
    // which side of the UTC/ET gap the run landed on.
    fake._seed('bookings', [
      { id: 'booking-recent', tenant_id: 'tenant-A', status: 'in_progress', end_time: '2026-01-05T20:30:00' }, // 3.5h ago ET wall-clock
    ])

    const res = await GET(req())
    const body = await res.json()
    const pipeline = body.checks.find((c: { name: string }) => c.name === 'Booking Pipeline')

    expect(pipeline.detail).toBe('Clean')
  })

  it('flags a pending booking as past its naive-ET start_time once it truly has passed in ET terms', async () => {
    // start_time is 1 minute in the future in ET wall-clock terms (23:31 ET,
    // "now" is 23:30 ET). Pre-fix, the boundary compared against the
    // UTC-shifted instant (00:30 UTC Jan 6) would have wrongly read this as
    // already past.
    fake._seed('bookings', [
      { id: 'booking-future-et', tenant_id: 'tenant-A', status: 'pending', start_time: '2026-01-05T23:31:00' },
    ])

    const res = await GET(req())
    const body = await res.json()
    const pipeline = body.checks.find((c: { name: string }) => c.name === 'Booking Pipeline')

    expect(pipeline.detail).toBe('Clean')
  })

  it('does not flag a completed booking as unpaid>24h when its naive-ET end_time is only ~23.5h stale', async () => {
    fake._seed('bookings', [
      {
        id: 'booking-almost-24h',
        tenant_id: 'tenant-A',
        status: 'completed',
        payment_status: 'unpaid',
        end_time: '2026-01-05T01:00:00', // ~22.5h before 23:30 ET "now"
      },
    ])

    const res = await GET(req())
    const body = await res.json()
    const payment = body.checks.find((c: { name: string }) => c.name === 'Payment Pipeline')

    expect(payment.detail).toBe('0 completed bookings unpaid >24h')
  })
})
