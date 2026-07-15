import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/message-applicants/preview — tenantDb() conversion wrong-tenant
 * probe (P1/W1 backlog batch). The applicant list previously carried its own
 * manual `.eq('tenant_id', tenantId)`; that filter now comes solely from the
 * wrapper — this proves tenant B's applicants never leak into tenant A's
 * broadcast preview.
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

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    cleaner_applications: [
      { id: 'app-A1', tenant_id: 'tenant-A', name: 'Jeff Tucker', phone: '+15551110001', status: 'pending', created_at: '2026-01-01' },
      { id: 'app-B1', tenant_id: 'tenant-B', name: 'Other Applicant', phone: '+15552220002', status: 'pending', created_at: '2026-01-01' },
    ],
  }
})

describe('POST /api/admin/message-applicants/preview — tenant isolation', () => {
  it("tenant A's preview only lists tenant A's applicants", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()

    const ids = [...json.eligible, ...json.excluded].map((a: { id: string }) => a.id)
    expect(ids).toEqual(['app-A1'])
  })

  it("tenant B's preview only lists tenant B's applicants", async () => {
    h.tenantId = 'tenant-B'
    const res = await POST()
    const json = await res.json()

    const ids = [...json.eligible, ...json.excluded].map((a: { id: string }) => a.id)
    expect(ids).toEqual(['app-B1'])
  })
})
