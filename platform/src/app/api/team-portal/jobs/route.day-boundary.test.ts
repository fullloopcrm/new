/**
 * GET /api/team-portal/jobs — day boundaries (`today`/`tomorrow`/`futureEnd`)
 * were built from `new Date(); setHours(0,0,0,0)`, the SERVER's local
 * calendar (UTC on Vercel), not ET -- silently shifting "today" by the
 * ET/UTC gap (4-5h) near midnight ET, the same day-boundary bug class fixed
 * across this session (see lib/recurring.ts's nowNaiveET/etToday headers).
 * bookings.start_time is naive-ET.
 *
 * Forces `process.env.TZ = 'UTC'` to simulate Vercel's actual runtime --
 * this sandbox's own local TZ (America/New_York) would otherwise make the
 * OLD code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
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

import { GET } from './route'
import { createToken } from '../auth/token'

const TENANT_A = 'tenant-A'
const MEMBER_A = 'member-A'

function req(): NextRequest {
  const token = createToken(MEMBER_A, TENANT_A, 25, 'worker')
  return new NextRequest('http://localhost/api/team-portal/jobs', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  h.seq = 0
  h.store = { bookings: [] }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/team-portal/jobs — ET day-boundary fix', () => {
  it('returns a job at 9pm EDT as one of "today"\'s jobs, not silently dropped past a UTC midnight rollover', async () => {
    // 9pm EDT == 1am UTC (next day) -- still "today" in ET, already
    // "tomorrow" on the server's UTC clock.
    vi.setSystemTime(new Date('2026-07-17T01:00:00.000Z')) // 1am UTC July 17 == 9pm EDT July 16
    h.store.bookings = [{
      id: 'b1', tenant_id: TENANT_A, team_member_id: MEMBER_A, status: 'scheduled',
      start_time: '2026-07-16T21:30:00', end_time: '2026-07-16T23:00:00',
      clients: { name: 'Jane Doe' },
    }]

    const res = await GET(req())
    const json = await res.json()

    expect(json.jobs).toHaveLength(1)
    expect(json.jobs[0].id).toBe('b1')
  })
})
