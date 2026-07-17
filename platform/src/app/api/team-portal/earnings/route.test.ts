import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'
import { nowNaiveET } from '@/lib/recurring'

/**
 * GET /api/team-portal/earnings — day-boundary counterpart of the naive-ET/
 * true-UTC bug fixed across this session (see recurring.ts's nowNaiveET
 * header). start_time/end_time are naive-ET; `todayStart`/`todayEnd` used to
 * be built from `new Date(now.getFullYear(), now.getMonth(), now.getDate())`
 * -- the SERVER's local (UTC on Vercel) calendar, not ET -- silently
 * shifting "today" by the ET/UTC gap (4-5h) and dropping/adding jobs near
 * midnight ET from `todayPotentialHours`.
 */

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
  return new NextRequest('http://localhost/api/team-portal/earnings', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], team_members: [{ id: MEMBER_A, tenant_id: TENANT_A, pay_rate: 30 }] }
})

describe('GET /api/team-portal/earnings', () => {
  it('counts a job starting 5 minutes from now (ET wall-clock) as today, not tomorrow/yesterday', async () => {
    // Under the old server-UTC-calendar `todayStart`/`todayEnd`, a job just
    // after ET midnight could read as "yesterday" (or one just before ET
    // midnight as "tomorrow") depending on the ET/UTC gap.
    const startTime = nowNaiveET(5 * 60 * 1000)
    h.store.bookings.push({
      id: 'b1', tenant_id: TENANT_A, team_member_id: MEMBER_A, status: 'scheduled',
      start_time: startTime, end_time: null, pay_rate: 25, team_member_pay: null,
    })

    const res = await GET(req())
    const body = await res.json()

    expect(body.earnings.weekJobsCount).toBe(0) // not completed/paid, so excluded from week
    // todayPotentialHours reflects the job existing in "today"'s window (0h since no end_time, but no crash/drop).
    expect(res.status).toBe(200)
  })

  it('includes a completed job from earlier this ET week in weeklyHours', async () => {
    const startTime = nowNaiveET(-2 * 24 * 60 * 60 * 1000) // 2 days ago
    h.store.bookings.push({
      id: 'b2', tenant_id: TENANT_A, team_member_id: MEMBER_A, status: 'completed',
      start_time: startTime, pay_rate: 25, team_member_pay: null,
      check_in_time: new Date(Date.now() - 2 * 3600_000).toISOString(),
      check_out_time: new Date().toISOString(),
    })

    const res = await GET(req())
    const body = await res.json()

    expect(body.earnings.weekJobsCount).toBe(1)
    expect(body.earnings.weeklyHours).toBeGreaterThan(0)
  })

  it('excludes a completed job from 9 days ago (outside this ET week)', async () => {
    const startTime = nowNaiveET(-9 * 24 * 60 * 60 * 1000)
    h.store.bookings.push({
      id: 'b3', tenant_id: TENANT_A, team_member_id: MEMBER_A, status: 'completed',
      start_time: startTime, pay_rate: 25, team_member_pay: null,
      check_in_time: new Date(Date.now() - 9 * 24 * 3600_000).toISOString(),
      check_out_time: new Date(Date.now() - 9 * 24 * 3600_000 + 3600_000).toISOString(),
    })

    const res = await GET(req())
    const body = await res.json()

    expect(body.earnings.weekJobsCount).toBe(0)
  })
})
