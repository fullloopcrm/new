import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/schedule-issues — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Despite the /admin/ URL segment this is an OWNER route
 * (getTenantForRequest, not requireAdmin) — verifies list + resolve never
 * cross tenant boundaries even when the caller guesses another tenant's
 * issue id.
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, role: 'admin' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, PUT } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    schedule_issues: [
      { id: 'iss-A1', tenant_id: 'tenant-A', status: 'open', severity: 1, message: 'a' },
      { id: 'iss-B1', tenant_id: 'tenant-B', status: 'open', severity: 1, message: 'b (secret)' },
    ],
  }
})

describe('GET /api/admin/schedule-issues — tenant isolation', () => {
  it("tenant A's issue list never includes tenant B's issues", async () => {
    const res = await GET(new Request('http://x'))
    const json = await res.json()
    expect(json.map((i: { id: string }) => i.id)).toEqual(['iss-A1'])
    expect(JSON.stringify(json)).not.toContain('secret')
  })
})

describe('PUT /api/admin/schedule-issues — tenant isolation', () => {
  it("tenant A cannot resolve tenant B's issue by guessing its id", async () => {
    const res = await PUT(putReq({ id: 'iss-B1', status: 'resolved' }))
    expect(res.status).toBe(500)
    const issue = h.store.schedule_issues.find((i) => i.id === 'iss-B1')
    expect(issue?.status).toBe('open')
  })

  it("tenant A can resolve its own issue", async () => {
    const res = await PUT(putReq({ id: 'iss-A1', status: 'resolved' }))
    expect(res.status).toBe(200)
    const issue = h.store.schedule_issues.find((i) => i.id === 'iss-A1')
    expect(issue?.status).toBe('resolved')
  })
})
