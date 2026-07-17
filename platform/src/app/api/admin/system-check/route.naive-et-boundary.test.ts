import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * bookings.start_time/end_time are naive-ET TIMESTAMP columns (no tz) --
 * literally the ET wall-clock digits. This is the admin-dashboard sibling of
 * cron/system-check (same 3 checks, same underlying query shapes) -- that
 * route already got the naive-ET fix (route.naive-et-boundary.test.ts), but
 * this one still built its "Booking Pipeline" and "Payment Pipeline"
 * boundaries with real `Date.now()` / `new Date().toISOString()` -- a
 * real-UTC instant -- compared directly against the naive-ET columns.
 * During the ~8pm-midnight ET window this is off by the whole EST/EDT
 * offset (4-5h).
 *
 * Real time in this test: 2026-01-06T04:30:00Z = 11:30pm EST Jan 5.
 */
process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel)

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'valid-token' }) }),
}))
vi.mock('@/app/api/admin-auth/route', () => ({
  verifyAdminToken: (token: string) => token === 'valid-token',
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

describe('POST /api/admin/system-check — naive-ET boundary, not real-UTC instant', () => {
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
    fake._seed('bookings', [
      { id: 'booking-recent', tenant_id: 'tenant-A', status: 'in_progress', end_time: '2026-01-05T20:30:00' }, // 3.5h ago ET wall-clock
    ])

    const res = await POST()
    const body = await res.json()
    const pipeline = body.checks.find((c: { name: string }) => c.name === 'Booking Pipeline')

    expect(pipeline.detail).toBe('Clean')
  })

  it('does not flag a pending booking past its naive-ET start_time when it has not truly passed in ET terms', async () => {
    fake._seed('bookings', [
      { id: 'booking-future-et', tenant_id: 'tenant-A', status: 'pending', start_time: '2026-01-05T23:31:00' }, // 1 min in the future, ET terms
    ])

    const res = await POST()
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

    const res = await POST()
    const body = await res.json()
    const payment = body.checks.find((c: { name: string }) => c.name === 'Payment Pipeline')

    expect(payment.detail).toBe('0 completed bookings unpaid >24h')
  })
})
