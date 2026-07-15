import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/schedule-issues/fix — schedules.edit gate (broad-hunt:
 * session-auth only, no requirePermission check, despite applying real
 * booking mutations — price changes, team_member unassignment, status
 * flips — with resolved_by hardcoded to 'admin' regardless of the actual
 * caller's role). Staff has schedules.view but not schedules.edit per
 * rbac.ts and must be rejected before any booking mutation runs.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-query')>()
  return { ...actual, getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: {}, role: h.role }) }
})

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    schedule_issues: [
      { id: 'iss-A1', tenant_id: 'tenant-A', type: 'price_mismatch', message: 'price', booking_id: 'book-A1', team_member_id: null, status: 'open' },
    ],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', start_time: '2026-01-01T09:00', end_time: '2026-01-01T11:00', price: 100, hourly_rate: 50, team_member_id: 'tm-1', status: 'confirmed' },
    ],
  }
})

describe('POST /api/admin/schedule-issues/fix — schedules.edit permission', () => {
  it('rejects staff (no schedules.edit) with 403 and applies no booking mutation', async () => {
    const res = await POST(postReq({ id: 'iss-A1', apply: true }))
    expect(res.status).toBe(403)
    expect(h.store.bookings[0].price).toBe(100)
    expect(h.store.schedule_issues[0].status).toBe('open')
  })

  it('allows a manager (has schedules.edit) to apply the fix', async () => {
    h.role = 'manager'
    const res = await POST(postReq({ id: 'iss-A1', apply: true }))
    expect(res.status).toBe(200)
    expect(h.store.bookings[0].price).toBe(10000)
  })
})
