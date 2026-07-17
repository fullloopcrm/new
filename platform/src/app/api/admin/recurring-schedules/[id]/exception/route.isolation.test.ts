import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/recurring-schedules/:id/exception — tenantDb() conversion
 * wrong-tenant probe (P1/W1 backlog batch). Every lookup/upsert/mutation
 * previously carried its own manual `.eq('tenant_id', tenantId)` (and a
 * manually threaded `tenant_id:` field on the upsert); those now come solely
 * from the wrapper. `book-X1` shares `schedule_id` with tenant A's schedule
 * but is tagged `tenant-B` (a data-integrity-attack shape) — it proves the
 * per-occurrence booking mutation is scoped by tenant_id, not schedule_id
 * alone.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', duration_hours: 3 },
      { id: 'sched-B1', tenant_id: 'tenant-B', duration_hours: 3 },
    ],
    recurring_exceptions: [],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-08-01T10:00:00' },
      { id: 'book-X1', tenant_id: 'tenant-B', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-08-01T10:00:00' },
    ],
    team_members: [
      { id: 'tm-A9', tenant_id: 'tenant-A', name: 'Sam A9' },
      { id: 'tm-old', tenant_id: 'tenant-A', name: 'Old Lead A' },
      { id: 'tm-other', tenant_id: 'tenant-B', name: 'Other Sam B' },
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'book-A1', team_member_id: 'tm-old', is_lead: true, position: 1 },
    ],
  }
})

describe('POST /api/admin/recurring-schedules/:id/exception — tenant isolation', () => {
  it("tenant A can never record an exception on tenant B's schedule", async () => {
    const res = await POST(postReq({ occurrence_date: '2026-08-01', type: 'skip' }), params('sched-B1'))
    expect(res.status).toBe(404)
    expect(h.store.recurring_exceptions.length).toBe(0)
  })

  it("a skip exception on tenant A's own schedule deletes only its own booking, never the same-schedule_id row owned by tenant B", async () => {
    const res = await POST(postReq({ occurrence_date: '2026-08-01', type: 'skip' }), params('sched-A1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.bookings_updated).toBe(1)

    expect(h.store.bookings.find((b) => b.id === 'book-A1')).toBeUndefined()
    expect(h.store.bookings.find((b) => b.id === 'book-X1')).toBeDefined()

    expect(h.store.recurring_exceptions.length).toBe(1)
    expect(h.store.recurring_exceptions[0].tenant_id).toBe('tenant-A')
  })

  it("a reassign exception updates only tenant A's booking, never tenant B's same-schedule_id row", async () => {
    const res = await POST(
      postReq({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-A9' }),
      params('sched-A1'),
    )
    expect(res.status).toBe(200)

    const bookA = h.store.bookings.find((b) => b.id === 'book-A1')
    const bookX = h.store.bookings.find((b) => b.id === 'book-X1')
    expect(bookA?.team_member_id).toBe('tm-A9')
    expect(bookX?.team_member_id).toBeUndefined()
  })

  it('a reassign exception updates the stale booking_team_members lead row too, not just bookings.team_member_id', async () => {
    // Regression: GET /api/bookings/:id/team and closeout-summary both source
    // the lead from booking_team_members, not bookings.team_member_id -- a
    // reassign that only updated the booking left the Team panel and payout
    // attribution pointing at the OLD member forever.
    const res = await POST(
      postReq({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-A9' }),
      params('sched-A1'),
    )
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-A1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe('tm-A9')
    expect(h.store.booking_team_members.find((r) => r.team_member_id === 'tm-old')).toBeUndefined()
  })

  it("rejects a new_team_member_id belonging to another tenant instead of writing it (FK injection)", async () => {
    const res = await POST(
      postReq({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-other' }),
      params('sched-A1'),
    )
    expect(res.status).toBe(400)

    const bookA = h.store.bookings.find((b) => b.id === 'book-A1')
    expect(bookA?.team_member_id).toBeUndefined()
    expect(h.store.recurring_exceptions.length).toBe(0)
  })

  it('a move exception that crosses midnight rolls end_time onto the NEXT calendar date, not before start_time on the same date', async () => {
    // Regression: the old `(startMin + durationMin) % 1440` truncation wrapped
    // 23:00 + 3h duration to "02:00" on the SAME occurrence_date instead of
    // advancing the date — an end_time before start_time on the same row.
    const res = await POST(
      postReq({ occurrence_date: '2026-08-01', type: 'move', new_start_time: '23:00' }),
      params('sched-A1'),
    )
    expect(res.status).toBe(200)
    const bookA = h.store.bookings.find((b) => b.id === 'book-A1')
    expect(bookA?.start_time).toBe('2026-08-01T23:00:00')
    expect(bookA?.end_time).toBe('2026-08-02T02:00:00')
    expect(new Date(String(bookA?.end_time) + 'Z').getTime()).toBeGreaterThan(new Date(String(bookA?.start_time) + 'Z').getTime())
  })
})
