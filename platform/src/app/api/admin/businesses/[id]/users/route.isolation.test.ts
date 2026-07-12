import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/businesses/[id]/users — tenantDb() conversion wrong-tenant
 * probe (P1/W1 queue-a). Platform-admin PIN-member management for a
 * specific tenant, keyed by URL id. Verifies list/create/delete never
 * cross tenant boundaries.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hashed-${pin}`,
  generateAdminPin: () => '1234',
}))

import { GET, POST, DELETE } from './route'

const params = (id: string) => Promise.resolve({ id })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const delReq = (userId: string) => new Request(`http://x?user_id=${userId}`, { method: 'DELETE' })

beforeEach(() => {
  h.seq = 0
  h.store = {
    tenant_members: [
      { id: 'm-A1', tenant_id: 'tenant-A', name: 'Alice', role: 'owner', created_at: '2026-01-01' },
      { id: 'm-B1', tenant_id: 'tenant-B', name: 'Bob', role: 'owner', created_at: '2026-01-01' },
    ],
  }
})

describe('GET /api/admin/businesses/[id]/users — tenant isolation', () => {
  it("tenant A's member list never includes tenant B's members", async () => {
    const res = await GET(new Request('http://x'), { params: params('tenant-A') })
    const json = await res.json()
    expect(json.users.map((u: { id: string }) => u.id)).toEqual(['m-A1'])
  })
})

describe('POST /api/admin/businesses/[id]/users — tenant isolation', () => {
  it("creating a member for tenant A stamps tenant-A, not the caller's id param bypass", async () => {
    const res = await POST(postReq({ name: 'Carol', role: 'staff' }), { params: params('tenant-A') })
    expect(res.status).toBe(200)
    const created = h.store.tenant_members.find((m) => m.name === 'Carol')
    expect(created?.tenant_id).toBe('tenant-A')
  })

  it("a member created for tenant A is invisible to tenant B's list", async () => {
    await POST(postReq({ name: 'Carol', role: 'staff' }), { params: params('tenant-A') })
    const res = await GET(new Request('http://x'), { params: params('tenant-B') })
    const json = await res.json()
    expect(json.users.some((u: { name: string }) => u.name === 'Carol')).toBe(false)
  })
})

describe('DELETE /api/admin/businesses/[id]/users — tenant isolation', () => {
  it("deleting via tenant A's id cannot remove tenant B's member even with B's user_id", async () => {
    const res = await DELETE(delReq('m-B1'), { params: params('tenant-A') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.some((m) => m.id === 'm-B1')).toBe(true)
  })

  it("deleting via tenant A's id removes A's own member", async () => {
    const res = await DELETE(delReq('m-A1'), { params: params('tenant-A') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.some((m) => m.id === 'm-A1')).toBe(false)
  })
})
