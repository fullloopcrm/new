/**
 * GET /api/leads/visits?period=today -- website_visits.created_at is
 * genuinely UTC, but `since.setHours(0,0,0,0)` built midnight in the
 * SERVER's local calendar (UTC on Vercel), not the business's ET calendar
 * day. During the ~4-5h ET-evening window where UTC has already rolled to
 * tomorrow, this excluded most of the real ET day's visits from the
 * dashboard's "today" period -- the same day-boundary bug class fixed
 * across this session, fresh call site in the leads/analytics pipeline.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique used throughout this
 * session's day-boundary tests) to simulate Vercel's actual runtime -- this
 * sandbox's own local TZ (America/New_York) would otherwise make the OLD
 * code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }),
}))

import { GET } from './route'

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  h.seq = 0
  h.store = { website_visits: [] }
})

afterEach(() => {
  vi.useRealTimers()
  process.env.TZ = realTZ
})

function req(period: string): NextRequest {
  return new NextRequest(`http://localhost/api/leads/visits?period=${period}`)
}

describe('GET /api/leads/visits?period=today -- ET day-boundary fix', () => {
  it('counts a visit from earlier tonight (real ET today) at 11:30pm EDT', async () => {
    // 11:30pm EDT July 17 == 3:30am UTC July 18 -- still "today" (Jul 17) in
    // ET, already tomorrow on the server's UTC clock. The OLD code's
    // since.setHours(0,0,0,0) would compute UTC midnight Jul 18 == 8pm ET
    // Jul 17, excluding this 2pm-ET visit from "today".
    vi.setSystemTime(new Date('2026-07-18T03:30:00.000Z'))
    h.store.website_visits = [{
      id: 'v1', tenant_id: 'tenant-A', session_id: 's1', visitor_id: 'vis1',
      action: 'visit', created_at: '2026-07-17T18:00:00.000Z', // 2pm ET today
    }]

    const res = await GET(req('today'))
    const json = await res.json()

    expect(json.stats.pageViews).toBe(1)
  })

  it('excludes a visit from real yesterday (ET) even though it is still "today" on the server UTC clock', async () => {
    vi.setSystemTime(new Date('2026-07-18T03:30:00.000Z'))
    h.store.website_visits = [{
      id: 'v2', tenant_id: 'tenant-A', session_id: 's2', visitor_id: 'vis2',
      action: 'visit', created_at: '2026-07-16T20:00:00.000Z', // 4pm ET yesterday
    }]

    const res = await GET(req('today'))
    const json = await res.json()

    expect(json.stats.pageViews).toBe(0)
  })
})
