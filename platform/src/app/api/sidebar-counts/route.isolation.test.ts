import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/sidebar-counts — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Fetched on every dashboard navigation
 * (dashboard-shell.tsx) — one of the 5 highest-traffic service_role
 * callsites converted this session. 6-way fan-out across clients / bookings
 * / website_visits / notifications / connect_channels / connect_read_cursors
 * / connect_messages — every count must be tenant-scoped independently.
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, userId: h.userId }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.userId = 'user-A'
  h.seq = 0
  h.store = {
    clients: [
      { id: 'c1', tenant_id: 'tenant-A' },
      { id: 'c2', tenant_id: 'tenant-B' },
      { id: 'c3', tenant_id: 'tenant-B' },
    ],
    bookings: [
      { id: 'b1', tenant_id: 'tenant-A', status: 'scheduled' },
      { id: 'b2', tenant_id: 'tenant-B', status: 'scheduled' },
      { id: 'b3', tenant_id: 'tenant-B', status: 'confirmed' },
    ],
    website_visits: [
      { id: 'v1', tenant_id: 'tenant-A' },
      { id: 'v2', tenant_id: 'tenant-B' },
    ],
    notifications: [
      { id: 'n1', tenant_id: 'tenant-A', read: false },
      { id: 'n2', tenant_id: 'tenant-B', read: false },
      { id: 'n3', tenant_id: 'tenant-B', read: false },
    ],
    connect_channels: [
      { id: 'chA', tenant_id: 'tenant-A' },
      { id: 'chB', tenant_id: 'tenant-B' },
    ],
    connect_read_cursors: [],
    connect_messages: [
      { id: 'm1', channel_id: 'chA', tenant_id: 'tenant-A', created_at: '2026-01-05' },
      { id: 'm2', channel_id: 'chB', tenant_id: 'tenant-B', created_at: '2026-01-05' },
    ],
  }
})

describe('GET /api/sidebar-counts — tenant isolation', () => {
  it("tenant A's counts reflect only its own rows, not tenant B's", async () => {
    h.tenantId = 'tenant-A'
    const res = await GET()
    const json = await res.json()
    expect(json.clients).toBe(1)
    expect(json.bookings).toBe(1)
    expect(json.leads).toBe(1)
    expect(json.notifications).toBe(1)
  })

  it("tenant A's connect-unread count does not include tenant B's unread channel", async () => {
    h.tenantId = 'tenant-A'
    const res = await GET()
    const json = await res.json()
    // A has exactly one channel (chA) with one message and no read cursor -> 1 unread channel.
    // If tenant scoping were dropped, B's chB (also unread) would inflate this to 2.
    expect(json.connect).toBe(1)
  })

  it("switching to tenant B never returns tenant A's counts", async () => {
    h.tenantId = 'tenant-B'
    h.userId = 'user-B'
    const res = await GET()
    const json = await res.json()
    expect(json.clients).toBe(2)
    expect(json.bookings).toBe(2)
  })
})
