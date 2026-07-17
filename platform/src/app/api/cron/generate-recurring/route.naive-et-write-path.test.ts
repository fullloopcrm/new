import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel); the naive-ET encoding depends on it

/**
 * bookings.start_time is naive-ET (no tz) -- occ.toISOString() digits get
 * written straight into the column, so those digits must already BE the
 * intended ET wall-clock time. This route builds that encoding by parsing
 * `schedule.preferred_time` with `Date#setHours`, which reads/writes in the
 * server's local timezone (UTC on Vercel) -- so it only lines up with ET as
 * long as every OTHER Date derived along the way (the no-prior-booking
 * `lastDate` fallback, the `fourWeeksOut` cutoff, and the ET-calendar-date
 * string used for exception/availability lookups) is built in that same
 * naive-ET-as-local-digits encoding, not a real UTC instant or a second
 * real America/New_York conversion layered on top of an already-encoded
 * value.
 *
 * Real time in this test: 2026-01-06T04:30:00Z = 11:30pm EST Jan 5 -- UTC
 * has already rolled to Jan 6, ET has not. A schedule with no prior booking
 * and preferred_time 08:00 (8am ET) must generate its first occurrence for
 * Jan 6 (tomorrow in ET), not Jan 7 (tomorrow in UTC's calendar, which is
 * what `lastDate = new Date()` / `fourWeeksOut = new Date()` would derive).
 */

const TENANT = 't-1'
const SCHEDULE_ID = 's-1'

type Row = Record<string, unknown>
let schedule: Row
const insertedRows: Row[] = []

vi.mock('@/lib/day-availability', () => ({
  worksScheduledDay: () => true,
  slotWithinHours: () => true,
}))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({}) })) // smart_recurring_assign off
vi.mock('@/lib/client-properties', () => ({
  getBookingAddress: async () => ({ address: null, latitude: null, longitude: null }),
}))
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: async () => [],
  pickBestTeam: () => ({ lead: null }),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ NYCMAID_TENANT_ID: 'nycmaid-0' }))

vi.mock('@/lib/supabase', () => {
  function recurringSchedulesChain() {
    return {
      select: () => ({
        eq: (col: string, val: unknown) => {
          if (col === 'tenant_id' && val === 'nycmaid-0') {
            return { eq: () => ({ lte: async () => ({ data: [], error: null }) }) }
          }
          return { then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: [{ ...schedule }], error: null }) }
        },
      }),
    }
  }

  function bookingsChain() {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [], error: null }), // no prior booking
          }),
        }),
      }),
      insert: (rowOrRows: Row | Row[]) => {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
        insertedRows.push(...rows)
        return Promise.resolve({ data: rows, error: null })
      },
    }
  }

  function recurringExceptionsChain() {
    return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) }
  }

  function notificationsChain() {
    return { insert: () => Promise.resolve({ data: null, error: null }) }
  }

  const from = (table: string) => {
    if (table === 'recurring_schedules') return recurringSchedulesChain()
    if (table === 'bookings') return bookingsChain()
    if (table === 'recurring_exceptions') return recurringExceptionsChain()
    if (table === 'notifications') return notificationsChain()
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

process.env.CRON_SECRET = 'unit-test-cron-secret'

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/generate-recurring', {
    headers: { authorization: 'Bearer unit-test-cron-secret' },
  })
}

beforeEach(() => {
  insertedRows.length = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T04:30:00.000Z')) // 11:30pm EST Jan 5
  schedule = {
    id: SCHEDULE_ID,
    tenant_id: TENANT,
    status: 'active',
    recurring_type: 'weekly',
    day_of_week: 1,
    preferred_time: '08:00',
    duration_hours: 2,
    team_member_id: null,
    service_type_id: null,
    client_id: 'c-1',
    property_id: null,
    hourly_rate: null,
    pay_rate: null,
    notes: null,
    special_instructions: null,
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/cron/generate-recurring — naive-ET write path', () => {
  it('generates the first occurrence for tomorrow in ET, not tomorrow in UTC', async () => {
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.generated).toBeGreaterThan(0)

    // Naive-ET column: the written digits ARE the ET wall-clock time.
    // Real "now" is 11:30pm ET Jan 5 -- tomorrow in ET is Jan 6, not Jan 7
    // (which is what a UTC-calendar-day computation would produce, since
    // UTC has already rolled over to Jan 6 by 11:30pm ET).
    expect(insertedRows[0].start_time).toBe('2026-01-06T08:00:00.000Z')
  })
})
