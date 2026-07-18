/**
 * POST /api/admin/recurring-schedules/:id/exception (type: reassign) —
 * booking_team_members lead-sync error handling. Same fix/rationale as
 * ../../../../team-portal/jobs/reassign/route.lead-sync-retry.test.ts and
 * ../../../../team-portal/jobs/claim/route.lead-sync-retry.test.ts: the
 * upsert's error was previously never checked, so a concurrent writer to
 * this booking's team that hits the new
 * booking_team_members_one_lead_per_booking unique index
 * (2026_07_18_booking_team_members_one_lead_per_booking.sql) would silently
 * leave the booking with no is_lead row at all. Now captured + retried once.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

const failNextUpserts = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'booking_team_members') return chain
      const origUpsert = chain.upsert as (payload: unknown, opts?: unknown) => unknown
      chain.upsert = (payload: unknown, opts?: unknown) => {
        if (failNextUpserts.count > 0) {
          failNextUpserts.count -= 1
          return {
            then: (res: (v: unknown) => unknown) =>
              Promise.resolve(res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "booking_team_members_one_lead_per_booking"' } })),
          }
        }
        return origUpsert(payload, opts)
      }
      return chain
    },
  }
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
    recurring_schedules: [{ id: 'sched-A1', tenant_id: 'tenant-A', duration_hours: 3 }],
    recurring_exceptions: [],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-08-01T10:00:00' },
    ],
    team_members: [{ id: 'tm-A9', tenant_id: 'tenant-A', name: 'Sam A9' }],
    booking_team_members: [
      { id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'book-A1', team_member_id: 'tm-old', is_lead: true, position: 1 },
    ],
  }
  failNextUpserts.count = 0
})

describe('POST .../exception (reassign) — lead-sync error handling', () => {
  it('retries once and succeeds when the first upsert hits a transient unique-index conflict', async () => {
    failNextUpserts.count = 1
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(
      postReq({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-A9' }),
      params('sched-A1'),
    )
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-A1' && r.is_lead)
    expect(leadRows).toHaveLength(1)
    expect(leadRows[0].team_member_id).toBe('tm-A9')
    expect(errSpy).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('logs loudly (does not silently swallow) if the retry ALSO fails, without failing the request', async () => {
    failNextUpserts.count = 2
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(
      postReq({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-A9' }),
      params('sched-A1'),
    )

    expect(res.status).toBe(200)
    const bookA = h.store.bookings.find((b) => b.id === 'book-A1')
    expect(bookA?.team_member_id).toBe('tm-A9')
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
