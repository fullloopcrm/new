import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/users/[id]/pin — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). `id` is a caller-supplied URL param — verifies tenant A
 * cannot set or clear tenant B's PIN via a guessed/reused member id.
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
vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hashed-${pin}`,
  generateAdminPin: () => '1234',
  isValidAdminPin: (pin: string) => /^\d{4,8}$/.test(pin),
}))

import { POST, DELETE } from './route'

const params = (id: string) => Promise.resolve({ id })
const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    tenant_members: [
      { id: 'm-A1', tenant_id: 'tenant-A', name: 'Alice', pin_hash: null, pin_set_at: null },
      { id: 'm-B1', tenant_id: 'tenant-B', name: 'Bob', pin_hash: 'existing-hash', pin_set_at: '2026-01-01' },
    ],
  }
})

describe('POST /api/admin/users/[id]/pin — tenant isolation', () => {
  it("tenant A cannot set a PIN on tenant B's member (404, pin_hash unchanged)", async () => {
    const res = await POST(postReq({ pin: '1234' }), { params: params('m-B1') })
    expect(res.status).toBe(404)
    const row = h.store.tenant_members.find((m) => m.id === 'm-B1')
    expect(row?.pin_hash).toBe('existing-hash')
  })

  it("tenant A can set a PIN on its own member", async () => {
    const res = await POST(postReq({ pin: '1234' }), { params: params('m-A1') })
    expect(res.status).toBe(200)
    const row = h.store.tenant_members.find((m) => m.id === 'm-A1')
    expect(row?.pin_hash).toBeTruthy()
  })
})

describe('DELETE /api/admin/users/[id]/pin — tenant isolation', () => {
  it("tenant A cannot clear tenant B's PIN (pin_hash survives)", async () => {
    await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: params('m-B1') })
    const row = h.store.tenant_members.find((m) => m.id === 'm-B1')
    expect(row?.pin_hash).toBe('existing-hash')
  })
})
