import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * team-portal/availability GET+PUT — wrong-column bug (fixed here).
 *
 * The crew member's own "Working Days" / "Time Off" page (/team,
 * /team/availability) read and wrote a JSON blob into team_members.notes
 * (`{ availability: { working_days, blocked_dates } }`, "Store availability
 * in member notes as JSON for now") instead of the real
 * team_members.working_days (TEXT[]), unavailable_dates (DATE[]), and
 * schedule (JSONB) columns — all added by migrations/013_full_parity.sql,
 * the same migration that added notification_preferences (the sibling bug
 * already fixed this session on this route's neighbor, preferences/route.ts).
 *
 * Those three real columns are exactly what the scheduling engine reads to
 * decide who's available on a given day: src/lib/smart-schedule.ts,
 * src/lib/availability.ts, src/lib/cleaner-availability.ts,
 * src/app/api/cron/generate-recurring/route.ts (auto-generates recurring
 * bookings), src/app/api/cron/schedule-monitor/route.ts, and
 * src/app/api/admin/find-cleaner/preview/route.ts (admin's manual assign
 * tool). None of them read notes.
 *
 * Consequence: a crew member requesting time off — even after this route's
 * own conflict check confirmed no existing booking on that date — had zero
 * effect on future scheduling. cron/generate-recurring could still generate
 * a new recurring booking on the exact date they blocked, and admin's
 * find-cleaner tool would still suggest them as available. Changing working
 * days via the portal never reached the column every scheduling surface
 * actually reads either.
 *
 * FIX: both handlers now target working_days/unavailable_dates/schedule
 * directly and leave `notes` untouched. Numeric day-index tokens (used by
 * /team/availability's UI) and day-name tokens (used by /team's own editor)
 * both round-trip correctly — day-availability.ts's dayTokenToIndex already
 * normalizes both formats on the read side.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => {
    if (token === 'token-a') return { id: 'member-a', tid: 'tid-a', role: 'worker' }
    if (token === 'token-b-on-a') return { id: 'member-b', tid: 'tid-a', role: 'worker' }
    return null
  },
}))

import { GET, PUT } from './route'

const TENANT_A = 'tid-a'
const MEMBER_A = 'member-a'

function seed() {
  return {
    team_members: [
      {
        id: MEMBER_A,
        tenant_id: TENANT_A,
        name: 'Alex Crew',
        notes: 'Some unrelated legacy text',
        working_days: null,
        unavailable_dates: null,
        schedule: null,
      },
    ],
    bookings: [] as Array<Record<string, unknown>>,
  }
}

function getReq(token: string): NextRequest {
  return new NextRequest('http://x/api/team-portal/availability', {
    headers: { authorization: `Bearer ${token}` },
  })
}

function putReq(token: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://x/api/team-portal/availability', {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('team-portal/availability — reads/writes the real working_days/unavailable_dates/schedule columns, not notes', () => {
  it('PUT with a numeric working_days array writes the real working_days column as strings', async () => {
    await PUT(putReq('token-a', { availability: { working_days: [1, 2, 3], blocked_dates: [] } }))
    const row = (h.seed.team_members as Array<{ id: string; working_days?: string[] }>).find((r) => r.id === MEMBER_A)
    expect(row?.working_days).toEqual(['1', '2', '3'])
  })

  it('PUT with blocked_dates writes the real unavailable_dates column', async () => {
    await PUT(putReq('token-a', { availability: { working_days: [1, 2, 3, 4, 5], blocked_dates: ['2026-08-01'] } }))
    const row = (h.seed.team_members as Array<{ id: string; unavailable_dates?: string[] }>).find((r) => r.id === MEMBER_A)
    expect(row?.unavailable_dates).toEqual(['2026-08-01'])
  })

  it('PUT with a schedule object writes the real schedule column', async () => {
    const schedule = { Mon: { start: '9:00 AM', end: '5:00 PM' } }
    await PUT(putReq('token-a', { availability: { working_days: ['Mon'], schedule, blocked_dates: [] } }))
    const row = (h.seed.team_members as Array<{ id: string; schedule?: unknown }>).find((r) => r.id === MEMBER_A)
    expect(row?.schedule).toEqual(schedule)
  })

  it('PUT never writes availability into notes', async () => {
    await PUT(putReq('token-a', { availability: { working_days: [1, 2, 3], blocked_dates: ['2026-08-01'] } }))
    const row = (h.seed.team_members as Array<{ id: string; notes?: string }>).find((r) => r.id === MEMBER_A)
    expect(row?.notes).toBe('Some unrelated legacy text')
  })

  it('GET reflects a saved working_days/blocked_dates from the real columns (what the scheduling engine actually reads), widening numeric tokens back to Number', async () => {
    await PUT(putReq('token-a', { availability: { working_days: [1, 3, 5], blocked_dates: ['2026-08-01', '2026-08-02'] } }))
    const res = await GET(getReq('token-a'))
    const body = await res.json()
    expect(body.availability.working_days).toEqual([1, 3, 5])
    expect(body.availability.blocked_dates).toEqual(['2026-08-01', '2026-08-02'])
  })

  it('GET passes day-name tokens through unchanged (the /team editor format)', async () => {
    await PUT(putReq('token-a', { availability: { working_days: ['Mon', 'Wed'], blocked_dates: [] } }))
    const res = await GET(getReq('token-a'))
    const body = await res.json()
    expect(body.availability.working_days).toEqual(['Mon', 'Wed'])
  })

  it('GET defaults working_days to Mon-Fri (numeric) when never configured, matching the prior notes-based default', async () => {
    const res = await GET(getReq('token-a'))
    const body = await res.json()
    expect(body.availability.working_days).toEqual([1, 2, 3, 4, 5])
    expect(body.availability.blocked_dates).toEqual([])
  })

  it('PUT still blocks a newly-requested blocked date that has an existing active booking, sourced from the real unavailable_dates column for the diff', async () => {
    h.seed.bookings.push({
      id: 'bk-1',
      tenant_id: TENANT_A,
      team_member_id: MEMBER_A,
      status: 'confirmed',
      start_time: '2026-08-01T14:00:00',
    })
    const res = await PUT(putReq('token-a', { availability: { working_days: [1, 2, 3, 4, 5], blocked_dates: ['2026-08-01'] } }))
    expect(res.status).toBe(409)
    const row = (h.seed.team_members as Array<{ id: string; unavailable_dates?: string[] | null }>).find((r) => r.id === MEMBER_A)
    expect(row?.unavailable_dates).toBeNull()
  })
})

describe('team-portal/availability — wrong-tenant / wrong-member probe', () => {
  it("member B's token cannot read or write member A's availability", async () => {
    await PUT(putReq('token-a', { availability: { working_days: [1, 2], blocked_dates: ['2026-08-01'] } }))

    const res = await GET(getReq('token-b-on-a'))
    const body = await res.json()
    // member-b has no seeded row, so this should return safe defaults, not member A's data
    expect(body.availability.working_days).toEqual([1, 2, 3, 4, 5])
    expect(body.availability.blocked_dates).toEqual([])
  })

  it('an invalid token is rejected before any write reaches team_members', async () => {
    const res = await PUT(putReq('bogus-token', { availability: { working_days: [1], blocked_dates: [] } }))
    expect(res.status).toBe(401)
    const row = (h.seed.team_members as Array<{ id: string; working_days?: string[] | null }>).find((r) => r.id === MEMBER_A)
    expect(row?.working_days).toBeNull()
  })
})
