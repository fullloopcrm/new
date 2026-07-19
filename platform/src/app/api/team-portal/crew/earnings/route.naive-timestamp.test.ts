import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * team-portal/crew/earnings GET — naive check_in_time misparse against a
 * proper-ISO fallback (nycmaid ref 64cba3c4, ported P1/W2).
 *
 * BUG this closes (deterministic, not a "now()"-relative flake): this route
 * computes worked hours as `(check_out_time || end_time) - (check_in_time ||
 * start_time)`. check_in_time/check_out_time are stored NAIVE (no tz, per
 * lib/dates.ts's own parseTimestamp doc comment — Supabase can return a
 * `timestamp` column without a 'Z' even though the value is UTC), while
 * start_time/end_time are always proper ISO with 'Z'. A job that's checked
 * in but not yet checked out (check_in_time set, check_out_time still null)
 * falls back to end_time on the end side — mixing a LOCAL-zone-misparsed
 * naive start against a correctly UTC-parsed ISO end. In this sandbox's ET
 * runtime that's a full 4-hour skew, which can collapse or inflate the
 * computed hours (nycmaid's own incident: rawMinutes floored to 0).
 *
 * FIX: both sides now go through parseTimestamp, which is a no-op for
 * already-Z-suffixed strings and correctly UTC-anchors naive ones.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: vi.fn(async () => ({ auth: { id: 'lead-1', tid: TENANT, role: 'manager' }, error: null })),
  scopedMemberIds: vi.fn(async () => ['tm-a']),
}))

import { GET } from './route'

function seed() {
  return {
    team_members: [{ id: 'tm-a', tenant_id: TENANT, name: 'Amy', pay_rate: 25 }],
    bookings: [
      {
        team_member_id: 'tm-a', tenant_id: TENANT, status: 'completed', pay_rate: 25,
        // Naive check-in (no tz) — a REAL 4-hour job, 09:00-13:00.
        check_in_time: '2026-07-14 09:00:00',
        check_out_time: null,
        start_time: '2026-07-14T09:00:00.000Z',
        // No check-out yet — falls back to end_time, which IS proper ISO.
        end_time: '2026-07-14T13:00:00.000Z',
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(): Request {
  return new Request('http://t/api/team-portal/crew/earnings')
}

describe('team-portal/crew/earnings GET — naive/proper-ISO mixed-source fix', () => {
  it('a naive check_in_time against a proper-ISO end_time still computes the real 4-hour span, not 0', async () => {
    const res = await GET(req())
    const body = await res.json()
    expect(res.status).toBe(200)
    const amy = body.members.find((m: { id: string }) => m.id === 'tm-a')
    // 4 hours × $25/hr = $100. Under the pre-fix bug (bare new Date() on the
    // naive check_in_time in this ET-runtime sandbox), start would parse ~4hrs
    // later than intended, colliding with or passing the ISO end_time and
    // collapsing hours toward 0 — same shape as nycmaid's own incident.
    expect(amy.earnings).toBe(100)
  })
})
