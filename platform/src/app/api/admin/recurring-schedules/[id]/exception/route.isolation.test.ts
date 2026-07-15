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
      { id: 'tm-A9', tenant_id: 'tenant-A' },
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
})
