import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * Tenant isolation — POST /api/equipment/:id/bookings.
 *
 * job_id/quote_id were saved straight from the request body with no
 * ownership check -- plain uuid PKs, no per-tenant namespace, no
 * cross-tenant FK constraint at the DB level (same class already fixed on
 * job-expenses/quote-budgets). No route currently reads equipment_bookings
 * back by job_id, so this isn't an active read-leak today, but it's still
 * real cross-tenant reference pollution a future job-detail join could
 * expose. Proves the check.
 */

const EQUIPMENT_ID = '00000000-0000-0000-0000-00000000e001'
const JOB_A = '00000000-0000-0000-0000-0000000000a1'
const JOB_B = '00000000-0000-0000-0000-0000000000b1'
const QUOTE_A = '00000000-0000-0000-0000-0000000000a2'
const QUOTE_B = '00000000-0000-0000-0000-0000000000b2'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = { params: Promise.resolve({ id: EQUIPMENT_ID }) }

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    equipment: [{ id: EQUIPMENT_ID, tenant_id: 'tenant-A', status: 'available' }],
    equipment_bookings: [],
    jobs: [
      { id: JOB_A, tenant_id: 'tenant-A' },
      { id: JOB_B, tenant_id: 'tenant-B' },
    ],
    quotes: [
      { id: QUOTE_A, tenant_id: 'tenant-A' },
      { id: QUOTE_B, tenant_id: 'tenant-B' },
    ],
  }
})

describe('POST /api/equipment/:id/bookings — cross-tenant reference isolation', () => {
  it("REJECTS a job_id belonging to another tenant, no booking row created", async () => {
    const res = await POST(postReq({ start_date: '2026-08-01', job_id: JOB_B }), params)
    expect(res.status).toBe(400)
    expect(h.store.equipment_bookings).toHaveLength(0)
  })

  it("REJECTS a quote_id belonging to another tenant", async () => {
    const res = await POST(postReq({ start_date: '2026-08-01', quote_id: QUOTE_B }), params)
    expect(res.status).toBe(400)
    expect(h.store.equipment_bookings).toHaveLength(0)
  })

  it("positive control: the same tenant's own job_id/quote_id are accepted", async () => {
    const res = await POST(postReq({ start_date: '2026-08-01', job_id: JOB_A, quote_id: QUOTE_A }), params)
    expect(res.status).toBe(200)
    expect(h.store.equipment_bookings).toHaveLength(1)
  })
})
