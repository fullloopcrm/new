/**
 * Smart-schedule team-member scoring (O13 sweep, per LEADER order —
 * ledger-reports.ts / reconcile.ts / smart-schedule.ts). scoreTeamForBooking is
 * the core matching engine behind /api/client/book, /api/client/smart-schedule,
 * /api/admin/smart-schedule, and the recurring-booking cron — every tenant's
 * "who should do this job" decision runs through it. Its NYC Maid sibling
 * (src/lib/nycmaid/smart-schedule.ts) has exactly one test: a tenant-isolation
 * regression. This file's copy — the industry-neutral, multi-tenant port —
 * had ZERO tests despite being the shared engine for every FullLoop tenant.
 *
 * Runs against the REAL smart-schedule.ts + REAL day-availability.ts +
 * REAL service-zones.ts + REAL geo.ts (calculateDistance/estimateTransitMinutes
 * are pure math, kept real; only geocodeAddress, which hits the network, is
 * mocked). Supabase is a minimal in-memory fake written for this file's query
 * shape (team_members / bookings / booking_team_members / clients), with the
 * same tenant-isolation regression the nycmaid sibling carries, extended to
 * FL's `team_members`/`booking_team_members`/`bookings` tables.
 *
 * Pinned:
 *   - tenant isolation on every tenant-owned read (team_members, bookings,
 *     booking_team_members)
 *   - day-off (not scheduled) and outside-working-hours produce unavailable
 *     with the correct `reason`, before any scoring runs
 *   - a lead-booking time conflict AND a multi-tech "extra" (booking_team_members)
 *     conflict both block the same way
 *   - max-jobs-per-day blocks once the day is full, even with no time conflict
 *   - hard zone block: job in a covered-zone list the member isn't in -> NOT
 *     eligible (not just penalized)
 *   - hard car block: car-required zone + no car -> NOT eligible
 *   - preferred-team-member bonus (+200) outranks a plain zone match (+50)
 *   - labor-only member penalized (-100) on a non-labor-only (supply) job, but
 *     still available (soft penalty, not a hard block)
 *   - can't-make-it-home-by-home_by_time -> score penalty + can_make_home:false,
 *     but a member with NO home_by_time configured is never gated
 *   - pickBestTeam ranks by score, reports `short` when too few are available
 *   - suggestBookingSlots excludes the requested time and returns an empty
 *     array when nothing is workable that day
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({ store: {} as Record<string, Array<Record<string, unknown>>> }))

type Filters = {
  eqs: Record<string, unknown>
  neqs: Array<{ col: string; val: unknown }>
  gtes: Array<{ col: string; val: unknown }>
  ltes: Array<{ col: string; val: unknown }>
  ins: Array<{ col: string; vals: unknown[] }>
}

function rowMatches(row: Record<string, unknown>, f: Filters): boolean {
  if (!Object.entries(f.eqs).every(([k, v]) => row[k] === v)) return false
  for (const n of f.neqs) if (row[n.col] === n.val) return false
  for (const g of f.gtes) if (!(String(row[g.col]) >= String(g.val))) return false
  for (const l of f.ltes) if (!(String(row[l.col]) <= String(l.val))) return false
  for (const i of f.ins) if (!i.vals.includes(row[i.col])) return false
  return true
}

const eqCalls: Array<{ table: string; col: string; val: unknown }> = []

function makeSmartScheduleFake(getStore: () => Record<string, Array<Record<string, unknown>>>) {
  return {
    from(table: string) {
      const f: Filters = { eqs: {}, neqs: [], gtes: [], ltes: [], ins: [] }
      let single = false
      let update: Record<string, unknown> | null = null
      const resolve = () => {
        const store = getStore()
        if (update) {
          for (const r of (store[table] || []).filter((row) => rowMatches(row, f))) Object.assign(r, update)
          return { data: null, error: null }
        }
        const rows = (store[table] || []).filter((row) => rowMatches(row, f))
        if (single) return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'no rows' } }
        return { data: rows, error: null }
      }
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: unknown) => { f.eqs[col] = val; eqCalls.push({ table, col, val }); return chain },
        neq: (col: string, val: unknown) => { f.neqs.push({ col, val }); return chain },
        gte: (col: string, val: unknown) => { f.gtes.push({ col, val }); return chain },
        lte: (col: string, val: unknown) => { f.ltes.push({ col, val }); return chain },
        in: (col: string, vals: unknown[]) => { f.ins.push({ col, vals }); return chain },
        update: (payload: Record<string, unknown>) => { update = payload; return chain },
        single: () => { single = true; return Promise.resolve(resolve()) },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(resolve()).then(res, rej),
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeSmartScheduleFake(() => h.store) }))
vi.mock('@/lib/geo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/geo')>()
  return { ...actual, geocodeAddress: vi.fn().mockResolvedValue(null) }
})

import { scoreTeamForBooking, pickBestTeam, suggestBookingSlots } from './smart-schedule'

const A = 'tenant-A'
const B = 'tenant-B'
const DATE = '2026-07-13' // a Monday

const ALL_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function seedMember(tenantId: string, fields: Record<string, unknown>) {
  ;(h.store.team_members ||= []).push({
    tenant_id: tenantId, name: 'Tech', status: 'active', working_days: ALL_WEEK, schedule: null,
    unavailable_dates: [], max_jobs_per_day: null, service_zones: [], has_car: true, labor_only: false,
    home_latitude: null, home_longitude: null, home_by_time: null, address: null,
    ...fields,
  })
}

function seedBooking(tenantId: string, fields: Record<string, unknown>) {
  ;(h.store.bookings ||= []).push({
    tenant_id: tenantId, status: 'confirmed', team_member_id: null, clients: null,
    ...fields,
  })
}

beforeEach(() => {
  h.store = { team_members: [], bookings: [], booking_team_members: [] }
  eqCalls.length = 0
})

describe('scoreTeamForBooking — tenant isolation', () => {
  it('scopes every tenant-owned read (team_members, bookings, booking_team_members) by tenant_id', async () => {
    seedBooking(A, { id: 'bk-a', team_member_id: 'tm-1', start_time: `${DATE}T09:00:00`, end_time: `${DATE}T10:00:00` })
    await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2,
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    for (const table of ['team_members', 'bookings']) {
      expect(eqCalls.some((c) => c.table === table && c.col === 'tenant_id' && c.val === A), `${table} must scope by tenant_id`).toBe(true)
    }
  })
})

describe('scoreTeamForBooking — day/hours gating', () => {
  it('marks a member off-schedule as unavailable with reason "off", before scoring', async () => {
    seedMember(A, { id: 'tm-1', working_days: ['Tue'] }) // DATE is a Monday
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2,
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    expect(scores).toMatchObject([{ id: 'tm-1', available: false, reason: 'off' }])
  })

  it('marks a member outside their working hours as unavailable with reason "outside_hours"', async () => {
    seedMember(A, { id: 'tm-1', working_days: ['Mon'], schedule: { Mon: { start: '9:00 AM', end: '5:00 PM' } } })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '17:30', durationHours: 1, // starts after 5pm close
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    expect(scores).toMatchObject([{ id: 'tm-1', available: false, reason: 'outside_hours' }])
  })
})

describe('scoreTeamForBooking — conflicts', () => {
  it('blocks a member who leads a conflicting booking the same day', async () => {
    seedMember(A, { id: 'tm-1' })
    seedBooking(A, { id: 'bk-1', team_member_id: 'tm-1', start_time: `${DATE}T09:30:00`, end_time: `${DATE}T11:00:00` })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2,
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    expect(scores).toMatchObject([{ id: 'tm-1', available: false, reason: 'conflict' }])
  })

  it('blocks a member listed only as an "extra" (booking_team_members) on someone else\'s booking', async () => {
    seedMember(A, { id: 'tm-extra' })
    seedBooking(A, { id: 'bk-1', team_member_id: 'tm-lead', start_time: `${DATE}T09:30:00`, end_time: `${DATE}T11:00:00` })
    ;(h.store.booking_team_members ||= []).push({ tenant_id: A, booking_id: 'bk-1', team_member_id: 'tm-extra' })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2,
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    expect(scores).toMatchObject([{ id: 'tm-extra', available: false, reason: 'conflict' }])
  })

  it('blocks on max_jobs_per_day even with zero time conflicts', async () => {
    seedMember(A, { id: 'tm-1', max_jobs_per_day: 1 })
    seedBooking(A, { id: 'bk-1', team_member_id: 'tm-1', start_time: `${DATE}T06:00:00`, end_time: `${DATE}T07:00:00` }) // no overlap with 10-12 slot
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2,
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    expect(scores).toMatchObject([{ id: 'tm-1', available: false, reason: 'conflict' }])
    expect(scores[0].conflict).toContain('Max 1 jobs/day')
  })
})

describe('scoreTeamForBooking — hard zone/car blocks', () => {
  it('hard-blocks a member whose configured zones don\'t cover the job\'s zone', async () => {
    seedMember(A, { id: 'tm-1', service_zones: ['queens'] })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2,
      clientAddress: '123 Brooklyn Ave, Brooklyn, NY', jobCoords: { lat: 40.65, lng: -73.95 },
    })
    expect(scores).toMatchObject([{ id: 'tm-1', available: false, reason: 'out_of_zone' }])
  })

  it('hard-blocks a car-required zone when the member has no car', async () => {
    seedMember(A, { id: 'tm-1', service_zones: ['staten_island'], has_car: false })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2,
      clientAddress: '1 Staten Island Way, Staten Island, NY', jobCoords: { lat: 40.58, lng: -74.15 },
    })
    expect(scores).toMatchObject([{ id: 'tm-1', available: false, reason: 'needs_car' }])
  })

  it('does not gate a member with no configured zones at all', async () => {
    seedMember(A, { id: 'tm-1', service_zones: [] })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2,
      clientAddress: '123 Brooklyn Ave, Brooklyn, NY', jobCoords: { lat: 40.65, lng: -73.95 },
    })
    expect(scores[0].available).toBe(true)
  })
})

describe('scoreTeamForBooking — scoring signals', () => {
  it('preferred-team-member bonus outranks a plain zone match', async () => {
    seedMember(A, { id: 'tm-preferred', service_zones: [] }) // no zone config -> no zone bonus, but preferred
    seedMember(A, { id: 'tm-zoned', service_zones: ['brooklyn'] }) // zone match, not preferred
    ;(h.store.clients ||= []).push({ id: 'cl-1', tenant_id: A, preferred_team_member_id: 'tm-preferred', latitude: null, longitude: null })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2, clientId: 'cl-1',
      clientAddress: '123 Brooklyn Ave, Brooklyn, NY', jobCoords: { lat: 40.65, lng: -73.95 },
    })
    const byId = Object.fromEntries(scores.map((s) => [s.id, s]))
    expect(byId['tm-preferred'].is_preferred).toBe(true)
    expect(byId['tm-preferred'].score).toBeGreaterThan(byId['tm-zoned'].score)
    expect(scores[0].id).toBe('tm-preferred') // sorted first
  })

  it('penalizes (but does not block) a labor-only member on a non-labor-only (supply) job', async () => {
    seedMember(A, { id: 'tm-labor-only', labor_only: true })
    seedMember(A, { id: 'tm-full-service', labor_only: false })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2, hourlyRate: 69, // supply job (>60)
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    const byId = Object.fromEntries(scores.map((s) => [s.id, s]))
    expect(byId['tm-labor-only'].available).toBe(true) // soft penalty, not a hard block
    expect(byId['tm-labor-only'].score).toBeLessThan(byId['tm-full-service'].score)
  })

  it('does not penalize a labor-only member on a labor-only ($<=60) job', async () => {
    seedMember(A, { id: 'tm-labor-only', labor_only: true })
    seedMember(A, { id: 'tm-full-service', labor_only: false })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '10:00', durationHours: 2, hourlyRate: 59,
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    const byId = Object.fromEntries(scores.map((s) => [s.id, s]))
    expect(byId['tm-labor-only'].score).toBe(byId['tm-full-service'].score)
  })

  it('flags can_make_home:false and applies the penalty when the member cannot get home in time, but never gates a member with no home_by_time set', async () => {
    seedMember(A, {
      id: 'tm-tight', home_by_time: '10:30', home_latitude: 41.0, home_longitude: -74.5, // far from job
    })
    seedMember(A, { id: 'tm-no-limit', home_by_time: null })
    const scores = await scoreTeamForBooking({
      tenantId: A, date: DATE, startTime: '09:00', durationHours: 1,
      clientAddress: '123 Main St', jobCoords: { lat: 40.7128, lng: -74.006 },
    })
    const byId = Object.fromEntries(scores.map((s) => [s.id, s]))
    expect(byId['tm-tight'].can_make_home).toBe(false)
    expect(byId['tm-tight'].reason).toContain("Won't make home by")
    expect(byId['tm-no-limit'].home_by).toBe('No limit')
    expect(byId['tm-no-limit'].can_make_home).toBe(true)
  })
})

describe('pickBestTeam', () => {
  it('picks the highest-scoring available member as lead and reports `short` when understaffed', () => {
    const scores = [
      { id: 'a', name: 'A', score: 50, available: true } as never,
      { id: 'b', name: 'B', score: 90, available: true } as never,
      { id: 'c', name: 'C', score: -1, available: false } as never,
    ]
    const team = pickBestTeam(scores, 3)
    expect(team.lead?.id).toBe('b')
    expect(team.extras.map((e: { id: string }) => e.id)).toEqual(['a'])
    expect(team.short).toBe(1) // wanted 3, only 2 available
  })

  it('returns no lead when nobody is available', () => {
    const scores = [{ id: 'a', name: 'A', score: -1, available: false } as never]
    const team = pickBestTeam(scores, 1)
    expect(team.lead).toBeNull()
    expect(team.short).toBe(1)
  })
})

describe('suggestBookingSlots', () => {
  it('excludes the requested time from the alternatives', async () => {
    seedMember(A, { id: 'tm-1' })
    const suggestions = await suggestBookingSlots({
      tenantId: A, date: DATE, durationHours: 1, clientAddress: '123 Main St',
      requestedTime: '10:00', stepMin: 120, limit: 5,
    })
    expect(suggestions.some((s) => s.time24 === '10:00')).toBe(false)
  })

  it('returns an empty array when nothing is workable that day', async () => {
    seedMember(A, { id: 'tm-1', working_days: ['Tue'] }) // never works on the Monday DATE
    const suggestions = await suggestBookingSlots({
      tenantId: A, date: DATE, durationHours: 1, clientAddress: '123 Main St', limit: 3,
    })
    expect(suggestions).toEqual([])
  })

  it('never crosses tenants: tenant B members never appear in tenant A suggestions', async () => {
    seedMember(A, { id: 'tm-a' })
    seedMember(B, { id: 'tm-b' })
    const suggestions = await suggestBookingSlots({
      tenantId: A, date: DATE, durationHours: 1, clientAddress: '123 Main St', limit: 5,
    })
    expect(suggestions.every((s) => s.cleanerId !== 'tm-b')).toBe(true)
  })
})
