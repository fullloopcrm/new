import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/users — tenantDb() conversion wrong-tenant probe (P1/W1 queue-a).
 * DELETE/PUT take a caller-supplied `id` in the body (not derived from the URL
 * or tenant context) — the sharpest cross-tenant vector: can tenant A delete
 * or mutate tenant B's tenant_members row just by guessing/reusing an id?
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

import { GET, DELETE, PUT } from './route'

const jsonReq = (method: string, body: unknown) =>
  new NextRequest('http://x', { method, body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    tenant_members: [
      { id: 'm-A1', tenant_id: 'tenant-A', name: 'Alice', role: 'staff', pin_hash: 'h1' },
      { id: 'm-B1', tenant_id: 'tenant-B', name: 'Bob', role: 'owner', pin_hash: 'h2' },
    ],
  }
})

describe('GET /api/admin/users — tenant isolation', () => {
  it("tenant A's member list never includes tenant B's rows", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.map((m: { id: string }) => m.id)).toEqual(['m-A1'])
    expect(JSON.stringify(json)).not.toContain('Bob')
  })
})

describe('DELETE /api/admin/users — tenant isolation', () => {
  it("tenant A cannot delete tenant B's member by id (404, row survives)", async () => {
    const res = await DELETE(jsonReq('DELETE', { id: 'm-B1' }))
    expect(res.status).toBe(404)
    expect(h.store.tenant_members.some((m) => m.id === 'm-B1')).toBe(true)
  })

  it("tenant A can delete its own member", async () => {
    const res = await DELETE(jsonReq('DELETE', { id: 'm-A1' }))
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.some((m) => m.id === 'm-A1')).toBe(false)
  })
})

describe('PUT /api/admin/users — tenant isolation', () => {
  it("tenant A cannot rename tenant B's member by id", async () => {
    await PUT(jsonReq('PUT', { id: 'm-B1', name: 'Hijacked' }))
    const row = h.store.tenant_members.find((m) => m.id === 'm-B1')
    expect(row?.name).toBe('Bob')
  })
})
