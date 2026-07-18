import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * cron/generate-recurring finds the latest booking already generated for a
 * recurring schedule, then INSERTs the next batch of future occurrence
 * rows — check-then-act, no DB constraint backing schedule_id+start_time
 * uniqueness at all. Two overlapping invocations of this weekly cron (a slow
 * run still going at the next scheduled trigger, a manual re-trigger, a
 * platform-level retry) both read the SAME latest booking for a schedule
 * before either INSERT commits, and both generate+insert the identical batch
 * of occurrences — duplicate future bookings for one recurring contract.
 * Real-money-adjacent for the dumpster/junk/moving standing-pickup archetype
 * (and every trade's recurring service).
 *
 * Fixed by a partial unique index on (schedule_id, start_time)
 * (migrations/2026_07_16_recurring_bookings_schedule_occurrence_dedup_PROPOSED.sql,
 * not yet applied) plus route.ts now treating that index's 23505 as an
 * idempotent no-op in the existing per-row insert fallback (added in
 * 56a53d3a to survive the fn_block_booking_overlap trigger without silent
 * batch loss) instead of lumping it in with a real overlap conflict and
 * sending a false "needs manual scheduling" admin alert.
 *
 * This test simulates the index already being live (a 23505 on the second
 * invocation's insert) to prove the app-side half of the fix; the index
 * itself isn't applied here per the file-only/no-prod-DDL standing rule.
 */

const TENANT = 't-1'
const SCHEDULE_ID = 's-1'

type Row = Record<string, unknown>
let schedule: Row
const insertedOccurrences = new Set<string>() // key: schedule_id|start_time
const notifications: Row[] = []

// Computed once at module load, not per call -- generateRecurringDates() must
// return the IDENTICAL Date (down to the millisecond) on both of the second
// test's overlapping GET invocations, since the mocked bookings insert keys
// duplicate detection on `${schedule_id}|${start_time}` (an ISO string with
// millisecond precision). A per-call `new Date(Date.now() + ...)` here would
// pick up the real wall-clock jitter between the two GET calls and produce
// two different start_time values, breaking the "same occurrence, overlapping
// invocation" scenario this test exists to simulate.
const FIXED_OCCURRENCE_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000)

vi.mock('@/lib/recurring', () => ({
  // One fixed, controlled occurrence date — bypasses real recurring-date math.
  generateRecurringDates: () => [FIXED_OCCURRENCE_DATE],
}))
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
            // auto-resume paused-schedule query — none in this test
            return { eq: () => ({ lte: async () => ({ data: [], error: null }) }) }
          }
          // .eq('status','active') list query
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
            limit: async () => ({ data: [], error: null }), // no prior booking — lastDate defaults to "now"
          }),
        }),
      }),
      insert: (rowOrRows: Row | Row[]) => {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
        // Batch call always fails to force the per-row fallback path (mirrors
        // the real fn_block_booking_overlap trigger aborting a whole batch
        // statement on any single conflicting row).
        if (Array.isArray(rowOrRows)) {
          return Promise.resolve({ data: null, error: { message: 'forced batch failure', code: 'XXXXX' } })
        }
        const row = rows[0]
        const key = `${row.schedule_id}|${row.start_time}`
        if (insertedOccurrences.has(key)) {
          return Promise.resolve({ data: null, error: { message: 'duplicate key value violates unique constraint "uq_bookings_schedule_occurrence"', code: '23505' } })
        }
        insertedOccurrences.add(key)
        return Promise.resolve({ data: [row], error: null })
      },
    }
  }

  function recurringExceptionsChain() {
    return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) }
  }

  function notificationsChain() {
    return { insert: (payload: Row) => { notifications.push(payload); return Promise.resolve({ data: null, error: null }) } }
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
  insertedOccurrences.clear()
  notifications.length = 0
  schedule = {
    id: SCHEDULE_ID,
    tenant_id: TENANT,
    status: 'active',
    recurring_type: 'weekly',
    day_of_week: 1,
    preferred_time: null,
    duration_hours: 2,
    team_member_id: null, // no member assignment path — simplest deterministic case
    service_type_id: null,
    client_id: 'c-1',
    property_id: null,
    hourly_rate: null,
    pay_rate: null,
    notes: null,
    special_instructions: null,
  }
})

describe('GET /api/cron/generate-recurring — duplicate-occurrence race', () => {
  it('generates the occurrence once', async () => {
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.generated).toBe(1)
    expect(notifications.some((n) => n.type === 'recurring_generation_conflict')).toBe(false)
  })

  it('treats a duplicate occurrence from an overlapping cron invocation as an idempotent no-op, not a conflict alert', async () => {
    const res1 = await GET(req())
    const json1 = await res1.json()
    expect(json1.generated).toBe(1)

    // A second, overlapping invocation for the same schedule — the exact
    // occurrence date was already inserted by the first, so this insert now
    // hits the (simulated) unique index and gets 23505.
    const res2 = await GET(req())
    const json2 = await res2.json()
    expect(res2.status).toBe(200)
    expect(json2.generated).toBe(0) // nothing NEW generated — already existed
    expect(notifications.some((n) => n.type === 'recurring_generation_conflict')).toBe(false)
  })
})
