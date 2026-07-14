import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/recurring-schedules/:id — tenantDb() conversion wrong-tenant
 * probe (P1/W1 backlog batch). GET/PUT/DELETE previously carried manual
 * `.eq('tenant_id', tenantId)` filters on every query; that filter now comes
 * solely from the wrapper. `book-X1` shares `schedule_id` with tenant A's
 * schedule but is tagged `tenant-B` — proves PUT's team-member reassignment
 * and DELETE's booking-cancel step are scoped by tenant_id, not schedule_id
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

import { GET, PUT, DELETE } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', status: 'active', team_member_id: 'tm-old' },
      { id: 'sched-B1', tenant_id: 'tenant-B', status: 'active', team_member_id: 'tm-old', notes: 'secret-B' },
    ],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2099-01-01T10:00:00', team_member_id: 'tm-old' },
      { id: 'book-B1', tenant_id: 'tenant-B', schedule_id: 'sched-B1', status: 'scheduled', start_time: '2099-01-01T10:00:00', team_member_id: 'tm-old' },
      { id: 'book-X1', tenant_id: 'tenant-B', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2099-01-01T10:00:00', team_member_id: 'tm-old' },
    ],
    team_members: [
      { id: 'tm-new', tenant_id: 'tenant-A', name: 'New Sam A' },
      { id: 'tm-other', tenant_id: 'tenant-B', name: 'Other Sam B' },
    ],
  }
})

describe('GET /api/admin/recurring-schedules/:id — tenant isolation', () => {
  it("tenant A cannot fetch tenant B's schedule by guessing its id", async () => {
    const res = await GET(new Request('http://x'), params('sched-B1'))
    expect(res.status).toBe(404)
    const text = JSON.stringify(await res.json())
    expect(text).not.toContain('secret-B')
  })

  it("tenant A fetching its own schedule's upcoming bookings never includes tenant B's same-schedule_id row", async () => {
    const res = await GET(new Request('http://x'), params('sched-A1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.upcoming_bookings.map((b: { id: string }) => b.id)).toEqual(['book-A1'])
  })
})

describe('PUT /api/admin/recurring-schedules/:id — tenant isolation', () => {
  it("tenant A can never edit tenant B's schedule by guessing its id", async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-new' }), params('sched-B1'))
    expect(res.status).toBe(500)
    const sched = h.store.recurring_schedules.find((s) => s.id === 'sched-B1')
    expect(sched?.team_member_id).toBe('tm-old')
  })

  it("reassigning tenant A's schedule never reassigns tenant B's same-schedule_id booking", async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-new' }), params('sched-A1'))
    expect(res.status).toBe(200)
    const bookA = h.store.bookings.find((b) => b.id === 'book-A1')
    const bookX = h.store.bookings.find((b) => b.id === 'book-X1')
    expect(bookA?.team_member_id).toBe('tm-new')
    expect(bookX?.team_member_id).toBe('tm-old')
  })

  it("rejects a team_member_id belonging to another tenant instead of writing it (FK injection)", async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-other' }), params('sched-A1'))
    expect(res.status).toBe(400)
    const sched = h.store.recurring_schedules.find((s) => s.id === 'sched-A1')
    expect(sched?.team_member_id).toBe('tm-old')
  })
})

describe('DELETE /api/admin/recurring-schedules/:id — tenant isolation', () => {
  it("tenant A can never cancel tenant B's schedule by guessing its id", async () => {
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), params('sched-B1'))
    expect(res.status).toBe(500)
    const sched = h.store.recurring_schedules.find((s) => s.id === 'sched-B1')
    expect(sched?.status).toBe('active')
  })

  it("cancelling tenant A's schedule never cancels tenant B's same-schedule_id booking", async () => {
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), params('sched-A1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.bookings_cancelled).toBe(1)
    const bookX = h.store.bookings.find((b) => b.id === 'book-X1')
    expect(bookX?.status).toBe('scheduled')
  })
})
