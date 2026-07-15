import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * availability.ts covers two independent regressions in checkAvailability():
 *
 * 1. The open_365 holiday gate: a tenant with open_365 OFF is CLOSED on a
 *    federal holiday (no slots), while an open_365 tenant (e.g. nycmaid)
 *    BYPASSES the holiday check entirely and proceeds to normal availability.
 *    Getting this backwards either darks a normal tenant's holiday or wrongly
 *    closes a 24/7 tenant — real money either way.
 *
 * 2. Regression (F4): checkAvailability() used to hardcode a 9am-5pm window
 *    and unconditionally block same-day bookings, ignoring the per-tenant
 *    business_hours_start/business_hours_end/allow_same_day settings that
 *    already exist elsewhere in the app (dashboard settings, portal bookings
 *    gate). That silently capped every tenant's self-booking widget at 9-4
 *    (last slot) and made same-day self-booking impossible no matter what a
 *    tenant configured — fatal for 24/7-emergency verticals (towing,
 *    restoration, emergency plumbing) that market same-day/around-the-clock
 *    service. These tests pin: (a) a tenant's configured hours are honored
 *    beyond the old 9-16 range, (b) allow_same_day=true actually allows
 *    same-day slots and excludes already-past hours, (c) allow_same_day=false
 *    still blocks same-day (existing opt-in behavior preserved).
 *
 * Real holiday date under test: Christmas of the current year (isHoliday
 * caches current + next year), which is never "today", so the same-day
 * short-circuit can't interfere with the holiday-gate tests.
 */

type Filters = Record<string, unknown>
let tableData: (table: string, filters: Filters) => unknown[]
let settingsOverride: Partial<{ open_365: boolean; allow_same_day: boolean; business_hours_start: number; business_hours_end: number }>

function builder(table: string) {
  const f: Filters = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      f[col] = val
      return chain
    },
    in: () => chain,
    gte: () => chain,
    lte: () => chain,
    neq: () => chain,
    then: (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: tableData(table, f), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
  supabase: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    open_365: false,
    allow_same_day: false,
    business_hours_start: 9,
    business_hours_end: 17,
    ...settingsOverride,
  }),
}))

import { checkAvailability } from './availability'

const ALL_DAYS = ['0', '1', '2', '3', '4', '5', '6']
const AVAILABLE_TEAM = [{ id: 'member-1', name: 'Alex', working_days: ALL_DAYS, schedule: null, unavailable_dates: null, status: 'active' }]

const YEAR = new Date().getFullYear()
const XMAS = `${YEAR}-12-25` // real federal holiday, never today
const ORDINARY = `${YEAR}-06-16` // asserted non-holiday in holidays.test.ts

beforeEach(() => {
  settingsOverride = {}
  tableData = () => []
  vi.useRealTimers()
})

describe('checkAvailability — open_365 holiday gate', () => {
  it('open_365 OFF: a holiday closes the tenant (no slots)', async () => {
    settingsOverride = { open_365: false }
    const res = await checkAvailability('tenant-1', XMAS, 2)
    expect(res.slots).toEqual([])
    expect(res.message).toBe('Closed for Christmas Day')
  })

  it('open_365 ON: the holiday check is BYPASSED (falls through to team lookup)', async () => {
    settingsOverride = { open_365: true }
    const res = await checkAvailability('tenant-1', XMAS, 2)
    // Bypassed the holiday close; with no team it reports team absence, NOT closure.
    expect(res.message).not.toMatch(/Closed for/)
    expect(res.message).toMatch(/No team members available/)
    expect(res.slots).toEqual([])
  })

  it('open_365 OFF on an ordinary day does NOT close — only holidays gate', async () => {
    settingsOverride = { open_365: false }
    const res = await checkAvailability('tenant-1', ORDINARY, 2)
    expect(res.message).not.toMatch(/Closed for/)
    expect(res.message).toMatch(/No team members available/)
  })

  it('same-day requests short-circuit before the holiday gate', async () => {
    const today = new Date().toLocaleDateString('en-CA')
    const res = await checkAvailability('tenant-1', today, 2)
    expect(res.sameDay).toBe(true)
    expect(res.message).toMatch(/Same-day/)
  })
})

describe('checkAvailability — business hours (F4)', () => {
  beforeEach(() => {
    tableData = (table) => (table === 'team_members' ? AVAILABLE_TEAM : [])
  })

  it('offers slots across the tenant-configured window, not just the old hardcoded 9am-4pm', async () => {
    settingsOverride = { business_hours_start: 6, business_hours_end: 22 }
    const result = await checkAvailability('tenant-1', '2026-08-10', 2)
    const times = result.slots.map((s) => s.time)
    expect(times).toContain('6:00 AM')
    // Old code hardcoded BUSINESS_END=17 and additionally capped the loop at
    // hour 16 via Math.min(lastStartHour, 16) — both are gone now.
    expect(times).toContain('8:00 PM')
    expect(times).not.toContain('4:00 AM')
  })

  it('falls back to 9am-5pm when the tenant has no configured hours', async () => {
    const result = await checkAvailability('tenant-1', '2026-08-10', 2)
    const times = result.slots.map((s) => s.time)
    expect(times[0]).toBe('9:00 AM')
    expect(times[times.length - 1]).toBe('3:00 PM') // last 2hr slot that ends by 5pm
  })
})

describe('checkAvailability — same-day (F4)', () => {
  beforeEach(() => {
    tableData = (table) => (table === 'team_members' ? AVAILABLE_TEAM : [])
  })

  it('blocks same-day when allow_same_day is false (existing opt-in behavior preserved)', async () => {
    vi.setSystemTime(new Date('2026-08-10T15:00:00'))
    const today = new Date().toLocaleDateString('en-CA')
    settingsOverride = { allow_same_day: false }

    const result = await checkAvailability('tenant-1', today, 2)
    expect(result.sameDay).toBe(true)
    expect(result.slots).toEqual([])
  })

  it('allows same-day booking when the tenant has opted in via allow_same_day', async () => {
    vi.setSystemTime(new Date('2026-08-10T09:00:00'))
    const today = new Date().toLocaleDateString('en-CA')
    settingsOverride = { allow_same_day: true, business_hours_start: 8, business_hours_end: 20 }

    const result = await checkAvailability('tenant-1', today, 2)
    expect(result.sameDay).toBeUndefined()
    expect(result.slots.length).toBeGreaterThan(0)
  })

  it('excludes already-past hours on a same-day booking', async () => {
    vi.setSystemTime(new Date('2026-08-10T14:30:00'))
    const today = new Date().toLocaleDateString('en-CA')
    settingsOverride = { allow_same_day: true, business_hours_start: 8, business_hours_end: 20 }

    const result = await checkAvailability('tenant-1', today, 2)
    const times = result.slots.map((s) => s.time)
    expect(times).not.toContain('9:00 AM')
    expect(times).not.toContain('2:00 PM')
    expect(times).toContain('3:00 PM')
  })
})
