import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/schedules/import — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Client/staff match maps must never cross tenants (a
 * same-phone client belonging to a different tenant must NOT be matched),
 * and imported bookings/recurring_schedules must be stamped the caller's
 * tenant even though the route no longer sets tenant_id by hand.
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
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId, role: 'owner' }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Ann Owner', phone: '5551234567' },
      { id: 'client-B1', tenant_id: 'tenant-B', name: 'Ann Owner', phone: '5559999999' },
    ],
    team_members: [],
    bookings: [],
    recurring_schedules: [],
  }
})

describe('POST /api/dashboard/schedules/import — tenant isolation', () => {
  it("a same-phone client belonging to tenant B is not matched from tenant A's import", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(
      postReq({ rows: [{ client_phone: '5559999999', start: '2026-08-01T10:00:00Z' }] })
    )
    const json = await res.json()
    expect(json.importedBookings).toBe(0)
    expect(json.unmatched).toBe(1)
    expect(h.store.bookings.length).toBe(0)
  })

  it("a booking imported by tenant A for its own client is stamped tenant-A", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(
      postReq({ rows: [{ client_phone: '5551234567', start: '2026-08-01T10:00:00Z' }] })
    )
    const json = await res.json()
    expect(json.importedBookings).toBe(1)
    const created = h.store.bookings.find((b) => b.client_id === 'client-A1')
    expect(created?.tenant_id).toBe('tenant-A')
  })

  it("tenant B never sees a booking imported by tenant A", async () => {
    h.tenantId = 'tenant-A'
    await POST(postReq({ rows: [{ client_phone: '5551234567', start: '2026-08-01T10:00:00Z' }] }))
    expect(h.store.bookings.every((b) => b.tenant_id !== 'tenant-B')).toBe(true)
  })
})
