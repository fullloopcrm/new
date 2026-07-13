import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/recurring-schedules/:id/pause — tenantDb() conversion
 * wrong-tenant probe (P1/W1 backlog batch). Every lookup/update previously
 * carried its own manual `.eq('tenant_id', tenantId)`; that filter now comes
 * solely from the wrapper. `book-X1` shares `schedule_id` with tenant A's
 * schedule but is tagged `tenant-B` (a data-integrity-attack shape) — it
 * proves the bookings-cancel step is scoped by tenant_id, not schedule_id
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

import { POST, DELETE } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', status: 'active', paused_until: null },
      { id: 'sched-B1', tenant_id: 'tenant-B', status: 'active', paused_until: null },
    ],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-08-01T10:00:00' },
      { id: 'book-B1', tenant_id: 'tenant-B', schedule_id: 'sched-B1', status: 'scheduled', start_time: '2026-08-01T10:00:00' },
      { id: 'book-X1', tenant_id: 'tenant-B', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-08-01T10:00:00' },
    ],
  }
})

describe('POST /api/admin/recurring-schedules/:id/pause — tenant isolation', () => {
  it("tenant A can never pause tenant B's schedule", async () => {
    const res = await POST(postReq({ paused_until: '2099-01-01' }), params('sched-B1'))
    expect(res.status).toBe(500)

    const schedB = h.store.recurring_schedules.find((s) => s.id === 'sched-B1')
    expect(schedB?.status).toBe('active')
    const bookB = h.store.bookings.find((b) => b.id === 'book-B1')
    expect(bookB?.status).toBe('scheduled')
  })

  it("tenant A pausing its own schedule cancels only its own in-window booking, never the same-schedule_id row owned by tenant B", async () => {
    const res = await POST(postReq({ paused_until: '2099-01-01' }), params('sched-A1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.bookings_cancelled).toBe(1)

    const schedA = h.store.recurring_schedules.find((s) => s.id === 'sched-A1')
    const bookA = h.store.bookings.find((b) => b.id === 'book-A1')
    const bookX = h.store.bookings.find((b) => b.id === 'book-X1')
    const bookB = h.store.bookings.find((b) => b.id === 'book-B1')
    expect(schedA?.status).toBe('paused')
    expect(bookA?.status).toBe('cancelled')
    expect(bookX?.status).toBe('scheduled')
    expect(bookB?.status).toBe('scheduled')
  })
})

describe('DELETE /api/admin/recurring-schedules/:id/pause — tenant isolation', () => {
  it("tenant A can never resume tenant B's schedule", async () => {
    h.store.recurring_schedules.find((s) => s.id === 'sched-B1')!.status = 'paused'
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), params('sched-B1'))
    expect(res.status).toBe(500)

    const schedB = h.store.recurring_schedules.find((s) => s.id === 'sched-B1')
    expect(schedB?.status).toBe('paused')
  })

  it("tenant A resumes its own paused schedule", async () => {
    h.store.recurring_schedules.find((s) => s.id === 'sched-A1')!.status = 'paused'
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), params('sched-A1'))
    expect(res.status).toBe(200)

    const schedA = h.store.recurring_schedules.find((s) => s.id === 'sched-A1')
    expect(schedA?.status).toBe('active')
  })
})
