import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * crm-02 fix (2026-07-31): this route hardcoded stats.total_clicks:0 and never
 * populated linkStats/recentActivity even though the frontend
 * (src/app/referral/[code]/page.tsx) already renders them and /api/track had
 * been writing real lead_clicks rows keyed by ref_code all along. Proves the
 * new aggregation reads that real data, and locks in the timezone-parsing fix
 * (real Supabase created_at values already carry a UTC offset like
 * "+00:00" -- blindly appending 'Z', the pattern this was ported from in the
 * sibling /api/referrers/analytics route, silently produces Invalid Date and
 * zeroes out thisWeek/thisMonth. Verified against live prod data 2026-07-31.)
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { rid: string; tid: string } | null
vi.mock('@/lib/referrer-portal-auth', () => ({
  getReferrerAuth: () => currentAuth,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-A'
const REFERRER_ID = 'referrer-A'
const CODE = 'ANTO526'
const fake = supabaseAdmin as unknown as FakeSupabase

function nowIso(hoursAgo: number): string {
  // Real Supabase/PostgREST timestamps carry an explicit UTC offset, e.g.
  // "2026-07-31T12:04:14.99887+00:00" -- reproduce that shape, not a bare
  // no-offset string, so this test would have caught the 'Z'-append bug.
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString().replace('Z', '+00:00')
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { rid: REFERRER_ID, tid: TENANT_ID }
  fake._seed('referrers', [
    {
      id: REFERRER_ID, tenant_id: TENANT_ID, name: 'Antoine', email: 'a@example.com',
      referral_code: CODE, commission_rate: 0.1, total_earned: 0, total_paid: 0,
      stripe_connect_account_id: null, stripe_ready_at: null,
    },
  ])
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Test Co', slug: 'testco', domain: 'testco.example.com', primary_color: '#000' },
  ])
  fake._seed('tenant_domains', [])
  fake._seed('referral_commissions', [])
  fake._seed('bookings', [])
  fake._seed('lead_clicks', [
    { ref_code: CODE, action: 'form_start', session_id: 's1', lead_id: null, device: 'mobile', created_at: nowIso(1), tenant_id: TENANT_ID },
    { ref_code: CODE, action: 'form_start', session_id: 's2', lead_id: null, device: 'desktop', created_at: nowIso(9), tenant_id: TENANT_ID },
    { ref_code: CODE, action: 'form_success', session_id: 's2', lead_id: null, device: 'desktop', created_at: nowIso(9), tenant_id: TENANT_ID },
    // Different tenant's click on an unrelated code -- must never leak in.
    { ref_code: 'OTHER', action: 'form_start', session_id: 's3', lead_id: null, device: 'mobile', created_at: nowIso(1), tenant_id: 'tenant-B' },
  ])
})

describe('GET /api/referrers/[code] — real click tracking (crm-02)', () => {
  it('total_clicks and linkStats.clicks reflect real lead_clicks rows for this code, not the old hardcoded 0', async () => {
    const res = await GET(new Request('https://x/api/referrers/ANTO526'), { params: Promise.resolve({ code: CODE }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.stats.total_clicks).toBe(3)
    expect(body.linkStats.clicks).toBe(3)
    expect(body.linkStats.uniqueVisitors).toBe(2)
    expect(body.linkStats.bookClicks).toBe(1)
  })

  it('thisWeek/thisMonth count recent same-day/same-week clicks correctly (timezone-offset regression guard)', async () => {
    const res = await GET(new Request('https://x/api/referrers/ANTO526'), { params: Promise.resolve({ code: CODE }) })
    const body = await res.json()
    // All 3 seeded clicks are within the last 9 hours -- both windows must
    // show 3, not 0. Before the fix these were always 0 for real
    // offset-bearing timestamps.
    expect(body.linkStats.thisWeek).toBe(3)
    expect(body.linkStats.thisMonth).toBe(3)
  })

  it('recentActivity is populated from real click rows, most recent first', async () => {
    const res = await GET(new Request('https://x/api/referrers/ANTO526'), { params: Promise.resolve({ code: CODE }) })
    const body = await res.json()
    expect(body.recentActivity.length).toBe(3)
    expect(body.recentActivity[0].action).toBe('form_start')
  })

  it("never counts another tenant's clicks on a different ref_code", async () => {
    const res = await GET(new Request('https://x/api/referrers/ANTO526'), { params: Promise.resolve({ code: CODE }) })
    const body = await res.json()
    expect(body.linkStats.clicks).toBe(3) // not 4 -- tenant-B's row excluded
  })
})
