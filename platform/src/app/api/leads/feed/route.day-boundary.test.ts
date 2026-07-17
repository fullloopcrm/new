/**
 * GET /api/leads/feed -- the "visits_today" outlook stat filtered
 * lead_clicks.created_at (genuinely UTC) against `todayStartIso`, built via
 * `new Date().setHours(0,0,0,0)`, the SERVER's local calendar (UTC on
 * Vercel), not the business's ET calendar day. During the ~4-5h ET-evening
 * window where UTC has already rolled to tomorrow, this excluded most of
 * the real ET day's clicks from "visits today" -- the same day-boundary bug
 * class fixed across this session, fresh call site in the leads/analytics
 * pipeline.
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
  h.store = { lead_clicks: [], clients: [], bookings: [] }
})

afterEach(() => {
  vi.useRealTimers()
  process.env.TZ = realTZ
})

function req(): NextRequest {
  return new NextRequest('http://localhost/api/leads/feed')
}

describe('GET /api/leads/feed -- visits_today ET day-boundary fix', () => {
  it('counts a click from earlier tonight (real ET today) at 11:30pm EDT', async () => {
    // 11:30pm EDT July 17 == 3:30am UTC July 18 -- still "today" (Jul 17) in
    // ET, already tomorrow on the server's UTC clock.
    vi.setSystemTime(new Date('2026-07-18T03:30:00.000Z'))
    h.store.lead_clicks = [{
      id: 'c1', tenant_id: 'tenant-A', session_id: 's1', action: 'page_view',
      created_at: '2026-07-17T18:00:00.000Z', // 2pm ET today
    }]

    const res = await GET(req())
    const json = await res.json()

    expect(json.stats.visits_today).toBe(1)
  })

  it('excludes a click from real yesterday (ET) even though it is still "today" on the server UTC clock', async () => {
    vi.setSystemTime(new Date('2026-07-18T03:30:00.000Z'))
    h.store.lead_clicks = [{
      id: 'c2', tenant_id: 'tenant-A', session_id: 's2', action: 'page_view',
      created_at: '2026-07-16T20:00:00.000Z', // 4pm ET yesterday
    }]

    const res = await GET(req())
    const json = await res.json()

    expect(json.stats.visits_today).toBe(0)
  })
})
