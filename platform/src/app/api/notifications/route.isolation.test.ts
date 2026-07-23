import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/notifications — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Fetched on every dashboard navigation
 * (dashboard-shell.tsx) — one of the 5 highest-traffic service_role
 * callsites converted this session. POST also resolves a caller-supplied
 * `booking_id` (IDOR surface) before texting the client.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

const notifyCalls: unknown[] = []

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/notify', () => ({
  notify: async (opts: unknown) => { notifyCalls.push(opts) },
}))

import { GET, POST } from './route'

const getReq = (qs = '') => new NextRequest(`http://x/api/notifications${qs}`)
const postReq = (body: unknown) =>
  new NextRequest('http://x/api/notifications', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  notifyCalls.length = 0
  h.store = {
    notifications: [
      { id: 'nA1', tenant_id: 'tenant-A', recipient_type: 'admin', metadata: {}, created_at: '2026-01-02' },
      { id: 'nB1', tenant_id: 'tenant-B', recipient_type: 'admin', metadata: {}, created_at: '2026-01-02' },
    ],
    bookings: [
      { id: 'bkA', tenant_id: 'tenant-A', client_id: 'clA', check_in_time: null, hourly_rate: null, clients: { name: 'Alice', phone: '+15550001' } },
      { id: 'bkB', tenant_id: 'tenant-B', client_id: 'clB', check_in_time: null, hourly_rate: null, clients: { name: 'Bob (secret)', phone: '+15550002' } },
    ],
  }
})

describe('GET /api/notifications — tenant isolation', () => {
  it("tenant A's list and unread count never include tenant B's notifications", async () => {
    h.tenantId = 'tenant-A'
    const res = await GET(getReq())
    const json = await res.json()
    expect(json.notifications.map((n: { id: string }) => n.id)).toEqual(['nA1'])
  })

  it("mark_read for tenant A does not mark tenant B's notification read", async () => {
    h.tenantId = 'tenant-A'
    await GET(getReq('?mark_read=true'))
    const bNotif = h.store.notifications.find((n) => n.id === 'nB1')
    expect((bNotif?.metadata as Record<string, unknown>)?.read).toBeUndefined()
    const aNotif = h.store.notifications.find((n) => n.id === 'nA1')
    expect((aNotif?.metadata as Record<string, unknown>)?.read).toBe(true)
  })
})

describe('POST /api/notifications — tenant isolation', () => {
  it("tenant A cannot trigger a client SMS by forging tenant B's booking_id (IDOR)", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ type: '30min_warning', booking_id: 'bkB', message: 'test' }))
    // The scoped booking lookup finds nothing for a foreign booking_id -- ownership
    // is verified before any write, so a miss 400s the whole request (no notification
    // row, no SMS to B's client).
    expect(res.status).toBe(400)
    expect(notifyCalls).toEqual([])
  })

  it("a valid same-tenant booking_id still triggers the client SMS", async () => {
    h.tenantId = 'tenant-A'
    const res = await POST(postReq({ type: '30min_warning', booking_id: 'bkA', message: 'test' }))
    expect(res.status).toBe(200)
    expect(notifyCalls).toHaveLength(1)
    expect((notifyCalls[0] as { recipientId: string }).recipientId).toBe('clA')
  })

  it("the inserted notification is stamped tenant-A and invisible to tenant B", async () => {
    h.tenantId = 'tenant-A'
    await POST(postReq({ type: '30min_warning', booking_id: null, message: 'A heads up' }))
    const inserted = h.store.notifications.find((n) => n.message === 'A heads up')
    expect(inserted?.tenant_id).toBe('tenant-A')
  })
})
