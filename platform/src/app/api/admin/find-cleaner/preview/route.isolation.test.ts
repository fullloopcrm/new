import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/find-cleaner/preview — tenantDb() conversion wrong-tenant probe
 * (P1/W1 backlog batch). The `team_members` and `bookings` lookups previously
 * carried their own manual `.eq('tenant_id', tenantId)`; that filter now
 * comes solely from the wrapper — this proves tenant B's team members never
 * appear in tenant A's dispatch preview, and tenant B's bookings are never
 * used to compute tenant A's cleaners' job-conflict/max-jobs exclusions.
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
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: {}, role: 'admin' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alice', phone: '+15551110001', status: 'active', working_days: null, schedule: null, unavailable_dates: [], service_zones: [], has_car: false, max_jobs_per_day: null, hourly_rate: 30, preferred_language: 'en' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Bob', phone: '+15552220002', status: 'active', working_days: null, schedule: null, unavailable_dates: [], service_zones: [], has_car: false, max_jobs_per_day: null, hourly_rate: 30, preferred_language: 'en' },
    ],
    bookings: [
      // Same job_date/time window for both — if tenant scoping were missing,
      // tenant B's booking would count toward tenant A's cleaner's job load.
      { id: 'bk-A1', tenant_id: 'tenant-A', team_member_id: 'tm-A1', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00', status: 'scheduled' },
      { id: 'bk-B1', tenant_id: 'tenant-B', team_member_id: 'tm-B1', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00', status: 'scheduled' },
    ],
  }
})

const body = { job_date: '2026-08-01', start_time: '09:00', duration_hours: 2 }

describe('POST /api/admin/find-cleaner/preview — tenant isolation', () => {
  it("tenant A's preview only lists tenant A's team members", async () => {
    const res = await POST(postReq(body))
    expect(res.status).toBe(200)
    const json = await res.json()

    const ids = [...json.eligible, ...json.excluded].map((c: { id: string }) => c.id)
    expect(ids).toEqual(['tm-A1'])
  })

  it("tenant A's cleaner shows a conflict from its own booking, not tenant B's", async () => {
    const res = await POST(postReq(body))
    const json = await res.json()

    const tmA = [...json.eligible, ...json.excluded].find((c: { id: string }) => c.id === 'tm-A1')
    expect(tmA.jobs_that_day).toBe(1)
  })

  it("tenant B's preview only lists tenant B's team member", async () => {
    h.tenantId = 'tenant-B'
    const res = await POST(postReq(body))
    const json = await res.json()

    const ids = [...json.eligible, ...json.excluded].map((c: { id: string }) => c.id)
    expect(ids).toEqual(['tm-B1'])
  })
})
