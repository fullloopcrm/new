import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Capacity-aware portal availability ────────────────────────────────────
// checkPortalAvailability() must NOT mark a slot fully booked just because
// ONE crew already has a job in that window — it should only fill up once
// every working crew that day is already committed. The old portal route
// treated any same-day booking overlap as blocking the whole tenant, which
// was capacity-blind for multi-crew tenants.

let teamMembersData: Array<Record<string, unknown>> = []
let bookingsData: Array<{ start_time: string; end_time: string }> = []

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {}
  const chain = ['select', 'eq', 'gte', 'lte', 'neq', 'not', 'order', 'limit']
  for (const m of chain) {
    builder[m] = vi.fn(() => builder)
  }
  builder.then = (resolve: (v: unknown) => void) => {
    if (table === 'team_members') return resolve({ data: teamMembersData, error: null })
    if (table === 'bookings') return resolve({ data: bookingsData, error: null })
    return resolve({ data: [], error: null })
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => makeBuilder(table)),
  },
}))

import { checkPortalAvailability } from './availability'

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
