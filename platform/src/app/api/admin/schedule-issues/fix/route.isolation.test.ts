import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/schedule-issues/fix — tenant isolation (P1/W1 queue-c +
 * cross-lane fix ported from p1-w2 commit 05176c2f). This is the shared
 * /dashboard Schedule Issues widget's "Resolve" action (every tenant's own
 * admin), NOT a platform-super-admin-only tool — it was wrongly gated on
 * requireAdmin() (401ing every ordinary tenant admin's Resolve click; only
 * the global super_admin PIN could ever use it) and the schedule_issue
 * lookup by id wasn't tenant-scoped at all. Now gated on
 * getTenantForRequest() (matching the sibling list/dismiss route) with the
 * issue lookup scoped to the caller's own tenant via tenantDb(tenantId).
 * The booking it references and the mutations it applies must still never
 * cross into a different tenant than the issue itself — even if
 * issue.booking_id points at a booking owned by another tenant (a stale/
 * crafted cross-tenant reference).
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
vi.mock('@/lib/tenant-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-query')>()
  return { ...actual, getTenantForRequest: async () => ({ tenantId: h.tenantId }) }
})

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    schedule_issues: [
      // iss-A1's booking_id is a foreign reference into tenant-B — the
      // scenario a stale/crafted cross-tenant reference would produce.
      { id: 'iss-A1', tenant_id: 'tenant-A', type: 'day_off', message: 'day off', booking_id: 'book-B1', team_member_id: null, status: 'open' },
      { id: 'iss-A2', tenant_id: 'tenant-A', type: 'price_mismatch', message: 'price', booking_id: 'book-A2', team_member_id: null, status: 'open' },
    ],
    bookings: [
      { id: 'book-B1', tenant_id: 'tenant-B', start_time: '2026-01-01T09:00', end_time: '2026-01-01T11:00', price: 100, hourly_rate: 50, team_member_id: 'tm-1', status: 'confirmed' },
      { id: 'book-A2', tenant_id: 'tenant-A', start_time: '2026-01-01T09:00', end_time: '2026-01-01T11:00', price: 100, hourly_rate: 50, team_member_id: 'tm-2', status: 'confirmed' },
    ],
  }
})

describe('POST /api/admin/schedule-issues/fix — tenant isolation', () => {
  it("preview never resolves a booking_id that belongs to a different tenant than the issue", async () => {
    const res = await POST(postReq({ id: 'iss-A1', apply: false }))
    const json = await res.json()
    // With raw supabaseAdmin (no tenant filter) this would have found book-B1
    // and returned a real "unassign team member" change plan. Scoped to
    // tenant-A, the cross-tenant booking is invisible → falls back to ack-only.
    expect(json.preview.acknowledgeOnly).toBe(true)
    expect(json.preview.changes).toEqual([])
  })

  it("apply never mutates the other tenant's booking via a crafted booking_id", async () => {
    const res = await POST(postReq({ id: 'iss-A1', apply: true }))
    expect(res.status).toBe(200)
    const booking = h.store.bookings.find((b) => b.id === 'book-B1')
    expect(booking?.team_member_id).toBe('tm-1')
    expect(booking?.status).toBe('confirmed')
    // The issue itself is in tenant A, so its own status update still succeeds.
    const issue = h.store.schedule_issues.find((i) => i.id === 'iss-A1')
    expect(issue?.status).toBe('resolved')
  })

  it("apply still fixes a real same-tenant price mismatch normally", async () => {
    const res = await POST(postReq({ id: 'iss-A2', apply: true }))
    expect(res.status).toBe(200)
    const booking = h.store.bookings.find((b) => b.id === 'book-A2')
    expect(booking?.price).toBe(10000)
  })

  it('an ordinary tenant admin (not a platform super-admin) can resolve their own issue', async () => {
    const res = await POST(postReq({ id: 'iss-A2', apply: false }))
    expect(res.status).toBe(200)
  })

  it("a tenant-B admin gets 'Issue not found', not tenant-A's issue, for a cross-tenant issue id", async () => {
    h.tenantId = 'tenant-B'

    const res = await POST(postReq({ id: 'iss-A2', apply: false }))

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'Issue not found' })
  })
})
