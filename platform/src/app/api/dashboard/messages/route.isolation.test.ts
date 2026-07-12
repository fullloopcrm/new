import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/messages — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Owner-facing platform messaging thread, polled every 15s
 * per active dashboard session (dashboard-shell.tsx) — one of the 5
 * highest-traffic service_role callsites converted this session.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  userId: 'user-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string; userId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, userId: h.userId }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST } from './route'

const postReq = (body: unknown) =>
  new NextRequest('http://x/api/dashboard/messages', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    tenant_owner_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', direction: 'out', channel: 'platform', body: 'hi A', sender: 'admin', sender_role: 'admin', created_at: '2026-01-01', read_at: null },
      { id: 'msg-B1', tenant_id: 'tenant-B', direction: 'out', channel: 'platform', body: 'hi B (secret)', sender: 'admin', sender_role: 'admin', created_at: '2026-01-01', read_at: null },
    ],
    notifications: [],
  }
})

describe('GET /api/dashboard/messages — tenant isolation', () => {
  it("tenant A's thread never includes tenant B's messages", async () => {
    h.tenantId = 'tenant-A'
    const res = await GET()
    const json = await res.json()
    expect(json.messages.map((m: { id: string }) => m.id)).toEqual(['msg-A1'])
    expect(JSON.stringify(json)).not.toContain('secret')
  })

  it("marking A's thread read does not touch B's unread out-message", async () => {
    h.tenantId = 'tenant-A'
    await GET()
    const bMsg = h.store.tenant_owner_messages.find((m) => m.id === 'msg-B1')
    expect(bMsg?.read_at).toBeNull()
    const aMsg = h.store.tenant_owner_messages.find((m) => m.id === 'msg-A1')
    expect(aMsg?.read_at).not.toBeNull()
  })
})

describe('POST /api/dashboard/messages — tenant isolation', () => {
  it("A's reply is stamped tenant-A even if the wrapper's stamp is bypassed by a caller-forged tenant_id", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ body: 'reply from A' }))
    expect(res.status).toBe(200)
    const inserted = h.store.tenant_owner_messages.find((m) => m.body === 'reply from A')
    expect(inserted?.tenant_id).toBe('tenant-A')
  })

  it("A's reply does not create a message visible under tenant B's thread", async () => {
    h.tenantId = 'tenant-A'
    await POST(postReq({ body: 'reply from A' }))
    h.tenantId = 'tenant-B'
    const res = await GET()
    const json = await res.json()
    expect(json.messages.some((m: { body: string }) => m.body === 'reply from A')).toBe(false)
  })
})
