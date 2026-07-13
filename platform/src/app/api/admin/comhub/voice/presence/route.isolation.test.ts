import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/comhub/voice/presence — tenantDb() conversion wrong-tenant probe
 * (P1/W1 backlog batch). GET/POST/DELETE previously carried their own manual
 * `.eq('tenant_id', tenantId)` (and the POST upsert manually threaded a
 * `tenant_id:` field); those now come solely from the wrapper — proves a
 * tenant's softphone heartbeat/unregister/roster read never leaks or writes
 * another tenant's presence row.
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
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => h.tenantId }))
vi.mock('@/lib/admin-member', () => ({
  getActiveAdminMemberId: async (tenantId: string) => (tenantId === 'tenant-A' ? 'admin-A1' : 'admin-B1'),
}))

import { GET, POST, DELETE } from './route'

const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  const now = new Date().toISOString()
  h.store = {
    comhub_admin_presence: [
      { id: 'p-A1', tenant_id: 'tenant-A', admin_id: 'admin-A1', sip_username: 'a1', status: 'available', last_seen_at: now },
      { id: 'p-B1', tenant_id: 'tenant-B', admin_id: 'admin-B1', sip_username: 'b1', status: 'available', last_seen_at: now },
    ],
  }
})

describe('GET /api/admin/comhub/voice/presence — tenant isolation', () => {
  it("tenant A's online roster never includes tenant B's admin", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.presence.map((p: { admin_id: string }) => p.admin_id)).toEqual(['admin-A1'])
  })
})

describe('POST /api/admin/comhub/voice/presence — tenant isolation', () => {
  it("a heartbeat is stamped with the caller's own tenant_id and never touches tenant B's row", async () => {
    const res = await POST(postReq({ sip_username: 'a1-new-device' }))
    expect(res.status).toBe(200)

    const rowA = h.store.comhub_admin_presence.find((p) => p.admin_id === 'admin-A1')
    const rowB = h.store.comhub_admin_presence.find((p) => p.admin_id === 'admin-B1')
    expect(rowA?.tenant_id).toBe('tenant-A')
    expect(rowA?.sip_username).toBe('a1-new-device')
    expect(rowB?.sip_username).toBe('b1')
  })
})

describe('DELETE /api/admin/comhub/voice/presence — tenant isolation', () => {
  it("tenant A's unregister only offlines its own admin, never tenant B's", async () => {
    const res = await DELETE()
    expect(res.status).toBe(200)

    const rowA = h.store.comhub_admin_presence.find((p) => p.admin_id === 'admin-A1')
    const rowB = h.store.comhub_admin_presence.find((p) => p.admin_id === 'admin-B1')
    expect(rowA?.status).toBe('offline')
    expect(rowB?.status).toBe('available')
  })
})
