import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel); the naive-ET encoding depends on it

/**
 * When `smart_recurring_assign` is ON and a schedule has no `preferred_time`,
 * the route scores team availability against a `startTime` computed by
 * `startHHMM()`. That helper's no-preferred_time fallback must derive the
 * time-of-day from the OCCURRENCE being generated (carried over from the
 * prior booking's start_time), not from `new Date()` -- the cron's own
 * real-world invocation time, which has nothing to do with when the job is
 * scheduled to run.
 *
 * Prior booking here starts at 14:00 (2pm) naive-ET. The cron itself runs at
 * a fake system time of 04:30 -- if `startHHMM()` used `new Date()`, scoring
 * would run against "04:30" instead of the occurrence's actual "14:00".
 */

const TENANT = 't-1'
const SCHEDULE_ID = 's-1'

type Row = Record<string, unknown>
let schedule: Row
const scoreCalls: { startTime: string }[] = []

vi.mock('@/lib/day-availability', () => ({
  worksScheduledDay: () => true,
  slotWithinHours: () => true,
}))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ smart_recurring_assign: true }) }))
vi.mock('@/lib/client-properties', () => ({
  getBookingAddress: async () => ({ address: null, latitude: null, longitude: null }),
}))
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: async (args: { startTime: string }) => {
    scoreCalls.push({ startTime: args.startTime })
    return []
  },
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
            // Prior booking: naive-ET 2pm Jan 5.
            limit: async () => ({ data: [{ start_time: '2026-01-05T14:00:00.000Z' }], error: null }),
          }),
        }),
      }),
      insert: (rowOrRows: Row | Row[]) => {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
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
  scoreCalls.length = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T04:30:00.000Z')) // cron's own real time: 04:30
  schedule = {
    id: SCHEDULE_ID,
    tenant_id: TENANT,
    status: 'active',
    recurring_type: 'weekly',
    day_of_week: 1,
    preferred_time: null, // no preferred_time -- exercises startHHMM()'s fallback branch
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

describe('GET /api/cron/generate-recurring — smart-assign startTime fallback', () => {
  it('scores against the occurrence carried-over time (14:00), not the cron real-time clock (04:30)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)

    expect(scoreCalls.length).toBeGreaterThan(0)
    for (const call of scoreCalls) {
      expect(call.startTime).toBe('14:00')
    }
  })
})
