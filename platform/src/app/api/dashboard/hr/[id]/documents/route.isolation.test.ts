import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/hr/[id]/documents — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). `id` is the team_member_id; document_id (PATCH) is also
 * caller-supplied. Verifies neither can be used to reach across tenants.
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

import { POST, PATCH } from './route'

const params = (id: string) => Promise.resolve({ id })
const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })
const patchReq = (body: unknown) => new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alice' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Bob' },
    ],
    hr_documents: [
      { id: 'doc-B1', tenant_id: 'tenant-B', team_member_id: 'tm-B1', doc_type: 'license', status: 'pending' },
    ],
  }
})

describe('POST /api/dashboard/hr/[id]/documents — tenant isolation', () => {
  it("tenant A cannot create a document under tenant B's employee id", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ doc_type: 'license' }), { params: params('tm-B1') })
    expect(res.status).toBe(404)
    expect(h.store.hr_documents.some((d) => d.team_member_id === 'tm-B1' && d.tenant_id === 'tenant-A')).toBe(false)
  })

  it("a document created for A's own employee is stamped tenant-A", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ doc_type: 'w4' }), { params: params('tm-A1') })
    expect(res.status).toBe(200)
    const doc = h.store.hr_documents.find((d) => d.doc_type === 'w4')
    expect(doc?.tenant_id).toBe('tenant-A')
  })
})

describe('PATCH /api/dashboard/hr/[id]/documents — tenant isolation', () => {
  it("tenant A cannot update tenant B's document even by guessing its document_id", async () => {
    h.tenantId = 'tenant-A'
    const res = await PATCH(patchReq({ document_id: 'doc-B1', status: 'approved' }), { params: params('tm-B1') })
    expect(res.status).toBe(404)
    const doc = h.store.hr_documents.find((d) => d.id === 'doc-B1')
    expect(doc?.status).toBe('pending')
  })
})
