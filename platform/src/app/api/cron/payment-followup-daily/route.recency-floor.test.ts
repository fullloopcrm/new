/**
 * GET /api/cron/payment-followup-daily — the 14-day recency floor used a
 * local toNaive() helper that read the SERVER's local calendar getters
 * (getFullYear/getMonth/getDate/getHours — UTC on Vercel), not ET, to build
 * a naive string compared against bookings.end_time (naive-ET, per
 * recurring.ts's nowNaiveET() convention). Same ET/UTC-gap bug class as the
 * other naive-ET cutoffs fixed across this codebase — silently shifted the
 * floor by 4-5h (and, near midnight ET, onto the wrong calendar day),
 * excluding recently-completed unpaid bookings from that window.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as the sibling
 * *.day-boundary.test.ts files) to simulate Vercel's actual runtime.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const gteCalls: Record<string, unknown> = {}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        not: () => chain,
        is: () => chain,
        gte: (col: string, val: unknown) => {
          if (table === 'bookings' && col === 'end_time') gteCalls.end_time = val
          return chain
        },
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => {
          if (table === 'tenants') {
            return resolve({
              data: [{
                id: 'tenant-A', name: 'Tenant A',
                telnyx_api_key: 'key', telnyx_phone: '+15551234567',
                payment_link: 'https://pay.example/tenant-a', owner_phone: null, phone: null,
              }],
              error: null,
            })
          }
          return resolve({ data: [], error: null })
        },
      }
      return chain
    },
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/payment-followup-daily?dry=1', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 10pm EDT on 2026-07-16 (2026-07-17T02:00:00Z) -- deliberately near a
// calendar-day boundary in ET so the old server-local-getter bug (which would
// read the UTC date instead) is caught, not just the hour offset.
const NOW = new Date('2026-07-17T02:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  gteCalls.end_time = undefined
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/payment-followup-daily — recency floor ET/UTC gap fix', () => {
  it('builds the 14-day recency floor in ET wall-clock, not the server UTC calendar', async () => {
    await GET(req() as never)

    // Correct: 14 days before the true ET instant (2026-07-16T22:00 EDT).
    expect(gteCalls.end_time).toBe('2026-07-02T22:00:00')
    // The old bug would have produced '2026-07-03T02:00:00' (server-UTC
    // getters on the floor instant) -- wrong hour AND wrong calendar day.
    expect(gteCalls.end_time).not.toBe('2026-07-03T02:00:00')
  })
})
