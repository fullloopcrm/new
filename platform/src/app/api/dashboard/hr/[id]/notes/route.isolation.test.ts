import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/hr/[id]/notes — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). `id` is the team_member_id (caller-supplied URL param);
 * verifies a tenant can't append a note to another tenant's employee even
 * with a correct-looking team_member_id.
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

import { POST } from './route'

const params = (id: string) => Promise.resolve({ id })
const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alice' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Bob' },
    ],
    hr_notes: [],
  }
})

describe('POST /api/dashboard/hr/[id]/notes — tenant isolation', () => {
  it("tenant A cannot append a note to tenant B's employee (404, no membership match)", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ body: 'late again' }), { params: params('tm-B1') })
    expect(res.status).toBe(404)
    expect(h.store.hr_notes.length).toBe(0)
  })

  it("a note appended for A's own employee is stamped tenant-A", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ body: 'great job' }), { params: params('tm-A1') })
    expect(res.status).toBe(200)
    const note = h.store.hr_notes.find((n) => n.body === 'great job')
    expect(note?.tenant_id).toBe('tenant-A')
  })

  it("A's note on their own employee is invisible to tenant B (different tenant context)", async () => {
    h.tenantId = 'tenant-A'
    await POST(postReq({ body: 'great job' }), { params: params('tm-A1') })
    h.tenantId = 'tenant-B'
    const res = await POST(postReq({ body: 'x' }), { params: params('tm-A1') })
    expect(res.status).toBe(404)
  })
})
