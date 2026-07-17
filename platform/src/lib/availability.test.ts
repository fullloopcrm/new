import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Regression (F4): checkAvailability() used to hardcode a 9am-5pm window and
 * unconditionally block same-day bookings, ignoring the per-tenant
 * business_hours_start/business_hours_end/allow_same_day settings that already
 * exist elsewhere in the app (dashboard settings, portal bookings gate). That
 * silently capped every tenant's self-booking widget at 9-4 (last slot) and
 * made same-day self-booking impossible no matter what a tenant configured —
 * which is fatal for 24/7-emergency verticals (towing, restoration, emergency
 * plumbing) that market same-day/around-the-clock service.
 *
 * These tests pin: (1) a tenant's configured hours are honored beyond the old
 * 9-16 range, (2) allow_same_day=true actually allows same-day slots and
 * excludes already-past hours, (3) allow_same_day=false still blocks same-day
 * (existing opt-in behavior preserved).
 */

type Filters = Record<string, unknown>
let tableData: (table: string, filters: Filters) => unknown[]

function builder(table: string) {
  const f: Filters = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      f[col] = val
      return chain
    },
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
}))

const ALL_DAYS = ['0', '1', '2', '3', '4', '5', '6']
const AVAILABLE_TEAM = [{ id: 'member-1', name: 'Alex', working_days: ALL_DAYS, schedule: null, unavailable_dates: null, status: 'active' }]

let settingsOverride: Partial<{ open_365: boolean; allow_same_day: boolean; business_hours_start: number; business_hours_end: number; timezone: string }>

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

beforeEach(() => {
  settingsOverride = {}
  tableData = (table) => (table === 'team_members' ? AVAILABLE_TEAM : [])
  vi.useRealTimers()
})

describe('checkAvailability — business hours (F4)', () => {
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

// "Today" (the same-day gate) and "now" (the already-past-hours filter) must
// both resolve in the tenant's own configured tenants.timezone, not the
// server runtime's default — comparing in the wrong zone silently mis-gated
// same-day availability during the multi-hour evening window before the
// tenant's local midnight, exactly the 24/7-emergency-vertical window this
// gate exists for (towing, restoration, emergency plumbing). Same bug shape
// as item (70)'s is_emergency fix. TZ is explicitly stubbed to UTC (Vercel's
// actual runtime default) rather than relying on the dev machine's own local
// zone, which is already America/New_York and would otherwise mask the bug.
describe('checkAvailability — same-day gate resolves in tenants.timezone, not the server default', () => {
  beforeEach(() => { vi.stubEnv('TZ', 'UTC') })
  afterEach(() => { vi.unstubAllEnvs() })

  it('a same-day (ET) request is still gated even though UTC has already rolled to the next calendar date', async () => {
    // 9:30pm EDT on Aug 10 = 2026-08-11T01:30:00Z -- UTC day is already Aug 11.
    vi.setSystemTime(new Date('2026-08-11T01:30:00.000Z'))
    settingsOverride = { allow_same_day: false, timezone: 'America/New_York' }

    const result = await checkAvailability('tenant-1', '2026-08-10', 2)
    expect(result.sameDay).toBe(true)
    expect(result.slots).toEqual([])
  })

  it('a Pacific tenant same-day request excludes already-past PT hours, not server-default hours', async () => {
    // 1:30pm PDT on Aug 10 = 2026-08-10T20:30:00Z.
    vi.setSystemTime(new Date('2026-08-10T20:30:00.000Z'))
    settingsOverride = { allow_same_day: true, business_hours_start: 8, business_hours_end: 20, timezone: 'America/Los_Angeles' }

    const result = await checkAvailability('tenant-1', '2026-08-10', 2)
    const times = result.slots.map((s) => s.time)
    expect(times).not.toContain('9:00 AM')
    expect(times).not.toContain('1:00 PM')
    expect(times).toContain('2:00 PM')
  })
})
