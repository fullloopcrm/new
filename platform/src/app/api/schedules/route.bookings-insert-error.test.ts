/**
 * POST /api/schedules -- the bookings batch insert's error was previously
 * discarded entirely (`await db.from('bookings').insert(bookings)`, return
 * value never read). The DB's trg_block_booking_overlap trigger
 * (015_booking_overlap_trigger.sql) raises on ANY row in a multi-row INSERT
 * that overlaps an existing booking for that team member, which aborts the
 * WHOLE statement -- a single-statement multi-row INSERT is atomic in
 * Postgres, not per-row. That meant a schedule assigned to a team member who
 * already had one conflicting booking anywhere in the generated window got
 * ZERO bookings created, yet this route still returned 201 with
 * `bookingsCreated: bookings.length` -- the INTENDED count, not the actual
 * one -- reporting false success. Sibling route POST
 * /api/admin/recurring-schedules already checks this same insert's error and
 * returns 500; this route now matches that convention.
 *
 * Uses a thin wrapper around the shared tenant-db fake that intercepts only
 * the `bookings` table's insert to simulate the trigger firing, since the
 * shared fake has no generic error-injection mechanism.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  audit: vi.fn(),
  generateRecurringDates: vi.fn(),
  failBookingsInsert: false,
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  generateRecurringDates: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  failBookingsInsert: boolean
}

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'

vi.mock('@/lib/supabase', () => {
  const realFake = makeTenantDbFake(h)
  // Wraps the shared fake so `.from('bookings')` can simulate the overlap
  // trigger raising on the whole batch when `h.failBookingsInsert` is set --
  // every other table (recurring_schedules, service_types) behaves exactly
  // as the shared fake normally does.
  const fake = {
    from(table: string) {
      if (table === 'bookings' && h.failBookingsInsert) {
        return {
          insert: () => ({
            select: () => Promise.resolve({
              data: null,
              error: { message: 'Booking overlap: team_member tm-1 already has booking bk-1 during 2026-08-01T09:00:00–2026-08-01T11:00:00' },
            }),
          }),
        }
      }
      return realFake.from(table)
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))
vi.mock('@/lib/recurring', async () => {
  const actual = await vi.importActual<typeof import('@/lib/recurring')>('@/lib/recurring')
  return { ...actual, generateRecurringDates: (...a: unknown[]) => h.generateRecurringDates(...a) }
})

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.failBookingsInsert = false
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: 'owner' }))
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.generateRecurringDates.mockReset()
  h.generateRecurringDates.mockReturnValue([new Date('2026-08-01T09:00:00'), new Date('2026-08-08T09:00:00')])
  h.store = { recurring_schedules: [], service_types: [], bookings: [] }
})

describe('POST /api/schedules -- bookings batch-insert error is surfaced, not swallowed', () => {
  it('returns 500 with the trigger error, not a false 201 success, when the whole batch is rejected', async () => {
    h.failBookingsInsert = true

    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', team_member_id: '33333333-3333-3333-3333-333333333333' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toContain('Booking overlap')
    // The bug: this used to be 201 with bookingsCreated:2 (the intended
    // count) even though zero bookings actually landed in the table.
    expect(json.bookingsCreated).toBeUndefined()
  })

  it('the schedule row still exists after the failed batch (matches sibling route behavior, not silently rolled back)', async () => {
    h.failBookingsInsert = true

    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.schedule).toBeDefined()
    expect(json.schedule.status).toBe('active')
  })

  it('regression control: a clean insert still returns 201 with the real inserted count', async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.bookingsCreated).toBe(2)
  })
})
