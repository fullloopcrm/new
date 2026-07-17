import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * cron/health-check "self-heals" stale in_progress bookings by
 * auto-completing any whose end_time was 4+ hours ago. bookings.end_time is
 * a naive-ET TIMESTAMP column (no tz) -- the cutoff was built from a real
 * `Date.now()` instant (`.toISOString()`), a real-UTC value, and compared
 * directly against it. During the ~8pm-midnight ET window (UTC already on
 * the next calendar day, ET hasn't rolled over), this skews the cutoff by
 * the EST/EDT offset (4-5h): a booking that's only been over a few hours
 * (in true elapsed time) can get its status silently flipped to
 * 'completed' -- a write, not just a misreported health check -- while the
 * cleaner may still legitimately be mid-service.
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
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/health-check — naive-ET boundary, not real-UTC instant (stale in_progress auto-complete)', () => {
  beforeEach(() => {
    fake._store.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T04:30:00.000Z')) // 11:30pm EST Jan 5
    fake._seed('tenants', [
      { id: 'tenant-A', name: 'Test Co', status: 'active' },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does NOT auto-complete an in_progress booking whose naive-ET end_time is only ~3h stale (real elapsed)', async () => {
    // end_time is 3h before "now" in ET wall-clock terms (20:30 ET vs 23:30
    // ET "now"). Pre-fix, the real-UTC fourHoursAgo cutoff crossed the
    // Jan-5/Jan-6 calendar boundary before this naive-ET string did, so the
    // lexical string comparison wrongly matched it as "before" the cutoff
    // and auto-completed a booking only 3h stale.
    fake._seed('bookings', [
      { id: 'booking-recent', tenant_id: 'tenant-A', status: 'in_progress', end_time: '2026-01-05T20:30:00' },
    ])

    const res = await GET(req())
    expect(res.status).toBe(200)

    const booking = fake._store.get('bookings')?.find((r) => r.id === 'booking-recent')
    expect(booking?.status).toBe('in_progress')
  })

  it('DOES auto-complete an in_progress booking whose naive-ET end_time is genuinely 5h+ stale', async () => {
    fake._seed('bookings', [
      { id: 'booking-stale', tenant_id: 'tenant-A', status: 'in_progress', end_time: '2026-01-05T18:00:00' },
    ])

    const res = await GET(req())
    expect(res.status).toBe(200)

    const booking = fake._store.get('bookings')?.find((r) => r.id === 'booking-stale')
    expect(booking?.status).toBe('completed')
  })
})
