import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/connect/messages — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Polled every 5s while the Connect thread view is open
 * (connect/page.tsx) — the single highest-frequency callsite converted this
 * session, and an IDOR surface (channel_id is caller-supplied).
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A', owner_name: null }, userId: h.userId }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST } from './route'

const getReq = (channelId: string) => new NextRequest(`http://x/api/connect/messages?channel_id=${channelId}`)
const postReq = (body: unknown) =>
  new NextRequest('http://x/api/connect/messages', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    connect_channels: [
      { id: 'chA', tenant_id: 'tenant-A', name: 'A General' },
      { id: 'chB', tenant_id: 'tenant-B', name: 'B General' },
    ],
    connect_messages: [
      { id: 'mA1', channel_id: 'chA', tenant_id: 'tenant-A', sender_type: 'owner', sender_id: 'user-A', sender_name: 'A', body: 'hi A', created_at: '2026-01-01' },
      { id: 'mB1', channel_id: 'chB', tenant_id: 'tenant-B', sender_type: 'owner', sender_id: 'user-B', sender_name: 'B', body: 'secret B message', created_at: '2026-01-01' },
    ],
    connect_read_cursors: [],
  }
})

describe('GET /api/connect/messages — tenant isolation', () => {
  it("tenant A cannot read tenant B's channel by forging its channel_id (IDOR)", async () => {
    h.tenantId = 'tenant-A'
    const res = await GET(getReq('chB'))
    expect(res.status).toBe(404)
  })

  it("tenant A reading its own channel never surfaces B's messages", async () => {
    h.tenantId = 'tenant-A'
    const res = await GET(getReq('chA'))
    const json = await res.json()
    expect(json.messages.map((m: { id: string }) => m.id)).toEqual(['mA1'])
    expect(JSON.stringify(json)).not.toContain('secret')
  })
})

describe('POST /api/connect/messages — tenant isolation', () => {
  it("tenant A cannot post into tenant B's channel by forging its channel_id (IDOR)", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ channel_id: 'chB', body: 'injected' }))
    expect(res.status).toBe(404)
    expect(h.store.connect_messages.some((m) => m.body === 'injected')).toBe(false)
  })

  it("a message posted by A is stamped tenant-A and invisible to tenant B", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ channel_id: 'chA', body: 'new from A' }))
    expect(res.status).toBe(201)
    const inserted = h.store.connect_messages.find((m) => m.body === 'new from A')
    expect(inserted?.tenant_id).toBe('tenant-A')

    h.tenantId = 'tenant-B'
    const resB = await GET(getReq('chA'))
    expect(resB.status).toBe(404) // B doesn't even own chA
  })
})
