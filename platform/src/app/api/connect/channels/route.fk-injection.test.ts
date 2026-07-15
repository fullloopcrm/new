import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/connect/channels — client_id FK-injection (broad-hunt: client_id
 * was written straight from the request body with zero check it belongs to
 * the caller's tenant, unlike the sibling portal/connect and
 * team-portal/connect routes, which both explicitly verify a caller-supplied
 * FK before using it — "Never trust a caller-supplied channel_id directly").
 * Same FK-injection class already fixed across bookings/recurring-schedules
 * this session.
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

import { POST } from './route'

const postReq = (body: unknown) =>
  new NextRequest('http://x/api/connect/channels', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    connect_channels: [],
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Alice (A)' },
      { id: 'client-B1', tenant_id: 'tenant-B', name: 'Bob (B, secret)' },
    ],
  }
})

describe('POST /api/connect/channels — client_id FK-injection', () => {
  it("rejects a client_id belonging to another tenant instead of silently linking it", async () => {
    const res = await POST(postReq({ name: 'Custom', type: 'custom', client_id: 'client-B1' }))

    expect(res.status).toBe(404)
    expect(h.store.connect_channels.length).toBe(0)
  })

  it("accepts a client_id that legitimately belongs to the caller's tenant", async () => {
    const res = await POST(postReq({ name: 'Custom', type: 'custom', client_id: 'client-A1' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.channel.client_id).toBe('client-A1')
  })
})
