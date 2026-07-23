import { describe, it, expect, vi, afterEach } from 'vitest'
import { nowNaiveET } from '@/lib/recurring'

/**
 * cron/payment-followup-daily -- p1-w1 queue item 8 (ET/UTC boundary sweep).
 * The 14-day recency floor used a local `toNaive(d)` helper built from
 * d.getFullYear()/getHours()/etc -- the SERVER's local calendar (UTC on
 * Vercel), not the ET wall-clock bookings.end_time is actually stored in.
 * Fixed to nowNaiveET(), the codebase's existing ET-aware helper.
 */

let gteCaptures: Array<{ col: string; val: unknown }> = []

const TENANT_ROW = {
  id: 'tenant-1', name: 'Test Co', telnyx_api_key: 'key', telnyx_phone: '+15551110000',
  payment_link: 'https://buy.stripe.com/test', owner_phone: '+15551110001', phone: '+15551110001',
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        gte: (col: string, val: unknown) => {
          if (table === 'bookings') gteCaptures.push({ col, val })
          return chain
        },
        not: () => chain,
        is: () => chain,
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => {
          if (table === 'tenants') return resolve({ data: [TENANT_ROW], error: null })
          return resolve({ data: [], error: null })
        },
      }
      return chain
    },
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => true) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/payment-followup-daily?force=1&dry=1', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

describe('cron/payment-followup-daily -- recency floor is ET-aware', () => {
  afterEach(() => {
    gteCaptures = []
    vi.restoreAllMocks()
  })

  it('builds the 14-day recency floor from ET wall-clock, not the server-local calendar', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    const expected = nowNaiveET(-14 * 24 * 60 * 60 * 1000)

    const res = await GET(req() as never)
    expect(res.status).toBe(200)

    const floorCapture = gteCaptures.find((c) => c.col === 'end_time')
    expect(floorCapture).toBeDefined()
    // Compare to the minute -- avoids flakiness from the route and this test
    // computing "now" a few ms apart.
    expect((floorCapture!.val as string).slice(0, 16)).toBe(expected.slice(0, 16))
  })
})
