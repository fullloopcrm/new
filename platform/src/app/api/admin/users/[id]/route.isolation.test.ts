import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/users/[id] — tenantDb() conversion wrong-tenant probe (P1/W1
 * queue-a). `id` is a caller-supplied URL param — verifies tenant A cannot
 * edit or delete tenant B's tenant_members row via a guessed/reused id.
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

import { PUT, DELETE } from './route'

const params = (id: string) => Promise.resolve({ id })
const putReq = (body: unknown) => new NextRequest('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    tenant_members: [
      { id: 'm-A1', tenant_id: 'tenant-A', name: 'Alice', role: 'staff' },
      { id: 'm-B1', tenant_id: 'tenant-B', name: 'Bob', role: 'owner' },
    ],
  }
})

describe('PUT /api/admin/users/[id] — tenant isolation', () => {
  it("tenant A cannot rename tenant B's member (500/no rows, name unchanged)", async () => {
    const res = await PUT(putReq({ name: 'Hijacked' }), { params: params('m-B1') })
    expect(res.status).not.toBe(200)
    const row = h.store.tenant_members.find((m) => m.id === 'm-B1')
    expect(row?.name).toBe('Bob')
  })

  it("tenant A can rename its own member", async () => {
    const res = await PUT(putReq({ name: 'Alicia' }), { params: params('m-A1') })
    expect(res.status).toBe(200)
    const row = h.store.tenant_members.find((m) => m.id === 'm-A1')
    expect(row?.name).toBe('Alicia')
  })
})

describe('DELETE /api/admin/users/[id] — tenant isolation', () => {
  it("tenant A cannot delete tenant B's member (404, row survives)", async () => {
    const res = await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: params('m-B1') })
    expect(res.status).toBe(404)
    expect(h.store.tenant_members.some((m) => m.id === 'm-B1')).toBe(true)
  })
})
