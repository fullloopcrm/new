import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/connect/channels — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Polled every 15s by the Connect inbox (connect/page.tsx)
 * — one of the 5 highest-traffic service_role callsites converted this
 * session.
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST } from './route'

const postReq = (body: unknown) =>
  new NextRequest('http://x/api/connect/channels', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    connect_channels: [
      { id: 'chA', tenant_id: 'tenant-A', name: 'A General', type: 'general', client_id: null, created_at: '2026-01-01' },
      { id: 'chB', tenant_id: 'tenant-B', name: 'B General (secret)', type: 'general', client_id: null, created_at: '2026-01-01' },
    ],
    connect_messages: [
      { id: 'm1', channel_id: 'chB', tenant_id: 'tenant-B', body: 'B secret last message', sender_name: 'Owner', created_at: '2026-01-02' },
    ],
  }
})

describe('GET /api/connect/channels — tenant isolation', () => {
  it("tenant A's channel list never includes tenant B's channel", async () => {
    h.tenantId = 'tenant-A'
    const res = await GET()
    const json = await res.json()
    expect(json.channels.map((c: { id: string }) => c.id)).toEqual(['chA'])
    expect(JSON.stringify(json)).not.toContain('secret')
  })
})

describe('POST /api/connect/channels — tenant isolation', () => {
  it("auto-create-general dedup does not return tenant B's general channel for tenant A", async () => {
    // A has no 'general' channel of its own in this scenario; only B does.
    h.tenantId = 'tenant-A'
    h.store.connect_channels = [
      { id: 'chB', tenant_id: 'tenant-B', name: 'B General (secret)', type: 'general', client_id: null, created_at: '2026-01-01' },
    ]
    const res = await POST(postReq({ name: 'General', type: 'general' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.channel.id).not.toBe('chB')
    expect(json.channel.tenant_id).toBe('tenant-A')
  })

  it("a new channel is stamped tenant-A and invisible to tenant B's GET", async () => {
    h.tenantId = 'tenant-A'
    await POST(postReq({ name: 'Custom', type: 'custom' }))
    h.tenantId = 'tenant-B'
    const res = await GET()
    const json = await res.json()
    expect(json.channels.some((c: { name: string }) => c.name === 'Custom')).toBe(false)
  })
})
