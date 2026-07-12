import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Capacity-aware portal availability ────────────────────────────────────
// checkPortalAvailability() must NOT mark a slot fully booked just because
// ONE crew already has a job in that window — it should only fill up once
// every working crew that day is already committed. The old portal route
// treated any same-day booking overlap as blocking the whole tenant, which
// was capacity-blind for multi-crew tenants.

let teamMembersData: Array<Record<string, unknown>> = []
let bookingsData: Array<{ start_time: string; end_time: string }> = []
let tenantRow: Record<string, unknown> | null = null
let serviceTypesData: Array<Record<string, unknown>> = []

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {}
  const chain = ['select', 'eq', 'gte', 'lte', 'neq', 'not', 'order', 'limit']
  for (const m of chain) {
    builder[m] = vi.fn(() => builder)
  }
  builder.single = vi.fn(() => Promise.resolve({ data: tenantRow, error: null }))
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: tenantRow, error: null }))
  builder.then = (resolve: (v: unknown) => void) => {
    if (table === 'team_members') return resolve({ data: teamMembersData, error: null })
    if (table === 'bookings') return resolve({ data: bookingsData, error: null })
    if (table === 'service_types') return resolve({ data: serviceTypesData, error: null })
    if (table === 'tenants') return resolve({ data: tenantRow, error: null })
    return resolve({ data: [], error: null })
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => makeBuilder(table)),
  },
}))

import { checkAvailability, checkPortalAvailability } from './availability'
import { clearSettingsCache } from './settings'

const activeMember = (id: string) => ({
  id,
  unavailable_dates: null,
  working_days: ['0', '1', '2', '3', '4', '5', '6'],
  schedule: null,
})

describe('checkPortalAvailability — multi-crew capacity', () => {
  beforeEach(() => {
    teamMembersData = []
    bookingsData = []
    tenantRow = null
    serviceTypesData = []
    clearSettingsCache()
  })

  it('keeps a slot available when one crew is booked but another crew is free', async () => {
    teamMembersData = [activeMember('crew-1'), activeMember('crew-2')]
    bookingsData = [
      { start_time: '2026-08-10T10:00:00', end_time: '2026-08-10T12:00:00' },
    ]

    const slots = await checkPortalAvailability('tenant-A', '2026-08-10', 2)
    const tenAm = slots.find((s) => s.time === '10:00 AM')

    expect(tenAm?.available).toBe(true)
  })

  it('marks a slot unavailable once overlapping bookings consume every crew', async () => {
    teamMembersData = [activeMember('crew-1'), activeMember('crew-2')]
    bookingsData = [
      { start_time: '2026-08-10T10:00:00', end_time: '2026-08-10T12:00:00' },
      { start_time: '2026-08-10T10:30:00', end_time: '2026-08-10T12:30:00' },
    ]

    const slots = await checkPortalAvailability('tenant-A', '2026-08-10', 2)
    const tenAm = slots.find((s) => s.time === '10:00 AM')

    expect(tenAm?.available).toBe(false)
  })

  it('marks every slot unavailable when no crew works that day', async () => {
    teamMembersData = []
    bookingsData = []

    const slots = await checkPortalAvailability('tenant-A', '2026-08-10', 2)

    expect(slots.every((s) => s.available === false)).toBe(true)
  })
})

// ── 24/7 / emergency tenants bypass the holiday + business-hours gate ─────
// F4: a tow/roadside/restoration tenant flagged 24/7 or emergency-available
// must be able to self-book off-hours and on holidays; a standard 9-5 tenant
// must still be blocked by both gates.

const HOLIDAY_DATE = '2026-12-25' // Christmas Day — always blocked for a standard tenant
const OFF_HOURS_DATE = '2026-08-11' // ordinary Tuesday, not a holiday

const tenantWithFlags = (flags: Record<string, unknown>) => ({
  id: 'tenant-x',
  selena_config: flags,
})

describe('checkAvailability — 24/7 / emergency bypass (F4)', () => {
  beforeEach(() => {
    teamMembersData = []
    bookingsData = []
    tenantRow = null
    serviceTypesData = []
    clearSettingsCache()
  })

  it('blocks a standard 9-5 tenant from booking on a holiday', async () => {
    tenantRow = tenantWithFlags({})
    teamMembersData = [activeMember('crew-1')]

    const result = await checkAvailability('standard-tenant', HOLIDAY_DATE, 2)

    expect(result.message).toMatch(/Closed for/)
    expect(result.slots).toEqual([])
  })

  it('lets a 24/7-flagged tenant book on a holiday', async () => {
    tenantRow = tenantWithFlags({ is_24_7: true })
    teamMembersData = [activeMember('crew-1')]

    const result = await checkAvailability('always-open-tenant', HOLIDAY_DATE, 2)

    expect(result.message).toBeUndefined()
    expect(result.slots.length).toBeGreaterThan(0)
  })

  it('lets an emergency-available tenant book on a holiday', async () => {
    tenantRow = tenantWithFlags({ emergency_available: true })
    teamMembersData = [activeMember('crew-1')]

    const result = await checkAvailability('emergency-tenant', HOLIDAY_DATE, 2)

    expect(result.message).toBeUndefined()
    expect(result.slots.length).toBeGreaterThan(0)
  })

  it('does not offer an off-hours (10pm) slot to a standard 9-5 tenant', async () => {
    tenantRow = tenantWithFlags({})
    teamMembersData = [activeMember('crew-1')]

    const result = await checkAvailability('standard-tenant', OFF_HOURS_DATE, 2)

    expect(result.slots.find((s) => s.time === '10:00 PM')).toBeUndefined()
  })

  it('offers an off-hours (10pm) slot to a 24/7-flagged tenant', async () => {
    tenantRow = tenantWithFlags({ is_24_7: true })
    teamMembersData = [activeMember('crew-1')]

    const result = await checkAvailability('always-open-tenant', OFF_HOURS_DATE, 2)
    const tenPm = result.slots.find((s) => s.time === '10:00 PM')

    expect(tenPm?.available).toBe(true)
  })
})

describe('checkPortalAvailability — 24/7 / emergency bypass (F4)', () => {
  beforeEach(() => {
    teamMembersData = []
    bookingsData = []
    tenantRow = null
    serviceTypesData = []
    clearSettingsCache()
  })

  it('does not offer a 2am slot to a standard 9-5 tenant', async () => {
    tenantRow = tenantWithFlags({})
    teamMembersData = [activeMember('crew-1')]

    const slots = await checkPortalAvailability('standard-tenant', OFF_HOURS_DATE, 2)

    expect(slots.find((s) => s.time === '2:00 AM')).toBeUndefined()
  })

  it('offers a bookable 2am slot to an emergency-available tenant', async () => {
    tenantRow = tenantWithFlags({ emergency_available: true })
    teamMembersData = [activeMember('crew-1')]

    const slots = await checkPortalAvailability('emergency-tenant', OFF_HOURS_DATE, 2)
    const twoAm = slots.find((s) => s.time === '2:00 AM')

    expect(twoAm?.available).toBe(true)
  })
})
