import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/schedules — per-occurrence conflict handling.
 *
 * Regression coverage for the bug reported live 2026-07-26: creating a
 * recurring schedule for a team member who already has ONE conflicting
 * booking on one of the 4 generated dates aborted the WHOLE creation (the
 * DB's fn_block_booking_overlap trigger blocks a multi-row insert on any
 * single conflicting row) — a single Thursday conflict blocked the entire
 * weekly schedule from being created at all.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' })),
  }
})

vi.mock('@/lib/validate', () => ({
  validate: (body: Record<string, unknown>, schema: Record<string, unknown>) => {
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(schema)) if (body[k] !== undefined) data[k] = body[k]
    return { data, error: null }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/client-properties', () => ({
  getBookingAddress: async () => ({ address: '123 Test St', latitude: 40.7, longitude: -73.9 }),
}))

// Two fixed weekly dates -- deterministic, no dependence on "today". The
// existing seeded booking below lands exactly on the second one to create a
// real conflict.
const DATE_1 = new Date('2026-08-06T09:00:00') // Thu -- free
const DATE_2 = new Date('2026-08-13T09:00:00') // Thu -- Gloria already booked
vi.mock('@/lib/recurring', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/recurring')>()
  return { ...actual, generateRecurringDates: () => [DATE_1, DATE_2] }
})

let smartAssign = false
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ smart_recurring_assign: smartAssign }),
}))

import { POST } from './route'

function seed() {
  return {
    recurring_schedules: [] as Record<string, unknown>[],
    bookings: [
      // Gloria's existing conflicting booking on DATE_2.
      // Naive local digits (no 'Z') -- matches how bookings.start_time is
      // actually stored (verified against live prod: preferred_time '09:00'
      // -> stored 'T09:00:00', no timezone conversion). toMin() in
      // smart-schedule.ts reads these digits raw, so a real .toISOString()
      // value here (UTC-shifted) would silently fail to register as a
      // conflict -- this bit my first draft of this test.
      { id: 'bk-existing', tenant_id: CTX_TENANT, team_member_id: 'gloria', start_time: '2026-08-13T09:00:00', end_time: '2026-08-13T11:00:00', status: 'scheduled' },
    ] as Record<string, unknown>[],
    clients: [{ id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client', latitude: 40.7, longitude: -73.9, preferred_team_member_id: null }],
    team_members: [
      { id: 'gloria', tenant_id: CTX_TENANT, name: 'Gloria', status: 'active', working_days: ['mon', 'tue', 'wed', 'thu', 'fri'], schedule: null, unavailable_dates: [], has_car: true, service_zones: null, home_by_time: null },
      { id: 'backup', tenant_id: CTX_TENANT, name: 'Backup', status: 'active', working_days: ['mon', 'tue', 'wed', 'thu', 'fri'], schedule: null, unavailable_dates: [], has_car: true, service_zones: null, home_by_time: null },
    ] as Record<string, unknown>[],
    service_types: [] as Record<string, unknown>[],
    booking_team_members: [] as Record<string, unknown>[],
  }
}

function postReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  smartAssign = false
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('POST /api/schedules — per-occurrence conflict handling', () => {
  it('creates the schedule successfully even when one of the 4 generated dates conflicts', async () => {
    const res = await POST(postReq({ client_id: 'client-a', team_member_id: 'gloria', recurring_type: 'weekly', day_of_week: 4 }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.bookingsCreated).toBe(2) // both dates land, not zero, not one
  })

  it('keeps the requested member on the date they are actually free', async () => {
    await POST(postReq({ client_id: 'client-a', team_member_id: 'gloria', recurring_type: 'weekly', day_of_week: 4 }))
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')!
    const free = bookingInsert.rows.find((r) => r.start_time === DATE_1.toISOString())!
    expect(free.team_member_id).toBe('gloria')
  })

  it('smart_recurring_assign OFF: leaves the conflicting date unassigned with a flagged note, does not silently reassign', async () => {
    smartAssign = false
    await POST(postReq({ client_id: 'client-a', team_member_id: 'gloria', recurring_type: 'weekly', day_of_week: 4 }))
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')!
    const conflicted = bookingInsert.rows.find((r) => r.start_time === DATE_2.toISOString())!
    expect(conflicted.team_member_id).toBeNull()
    expect(String(conflicted.notes)).toMatch(/unavailable|needs reassignment/i)
  })

  it('smart_recurring_assign ON: reassigns the conflicting date to the best available alternate instead of leaving it unassigned', async () => {
    smartAssign = true
    await POST(postReq({ client_id: 'client-a', team_member_id: 'gloria', recurring_type: 'weekly', day_of_week: 4 }))
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')!
    const conflicted = bookingInsert.rows.find((r) => r.start_time === DATE_2.toISOString())!
    expect(conflicted.team_member_id).toBe('backup')
  })

  it('does not touch a schedule with no team_member_id at all (unassigned schedules still work)', async () => {
    const res = await POST(postReq({ client_id: 'client-a', recurring_type: 'weekly', day_of_week: 4 }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.bookingsCreated).toBe(2)
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')!
    expect(bookingInsert.rows.every((r) => r.team_member_id === null)).toBe(true)
  })
})
