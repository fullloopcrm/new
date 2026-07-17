/**
 * POST /api/team-portal/jobs/claim — the daily-claim-cap window (`dayStart`/
 * `dayEnd`) was built from `new Date(); setHours(0,0,0,0)`, the SERVER's
 * local calendar (UTC on Vercel), not ET -- silently shifting "today" by the
 * ET/UTC gap (4-5h) near midnight ET, the same day-boundary bug class fixed
 * across this session. bookings.start_time is naive-ET (see
 * lib/recurring.ts's nowNaiveET header).
 *
 * Forces `process.env.TZ = 'UTC'` to simulate Vercel's actual runtime --
 * this sandbox's own local TZ (America/New_York) would otherwise make the
 * OLD code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'
import { createToken } from '../../auth/token'

const TENANT_A = 'tenant-A'
const MEMBER_A = 'member-A'

function req(bookingId: string): Request {
  const token = createToken(MEMBER_A, TENANT_A, 25, 'worker')
  return new Request('http://localhost/api/team-portal/jobs/claim', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId }),
  })
}

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  h.seq = 0
  h.store = {
    bookings: [],
    team_members: [{ id: MEMBER_A, tenant_id: TENANT_A, status: 'active', pay_rate: 25, max_jobs_per_day: 1 }],
    tenants: [{ id: TENANT_A, selena_config: null }],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('POST /api/team-portal/jobs/claim — ET day-boundary fix', () => {
  it('enforces the daily cap against a 9pm-EDT job already assigned today, not silently ignored past a UTC midnight rollover', async () => {
    // 9pm EDT == 1am UTC (next day) -- still "today" in ET, already
    // "tomorrow" on the server's UTC clock.
    vi.setSystemTime(new Date('2026-07-17T01:00:00.000Z')) // 1am UTC July 17 == 9pm EDT July 16
    h.store.bookings = [
      {
        id: 'existing', tenant_id: TENANT_A, team_member_id: MEMBER_A, status: 'confirmed',
        start_time: '2026-07-16T21:30:00',
      },
      {
        id: 'open', tenant_id: TENANT_A, team_member_id: null, status: 'scheduled',
        start_time: '2026-07-17T15:00:00',
      },
    ]

    const res = await POST(req('open'))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/Daily job limit reached/)
  })
})
