import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/campaigns/preview — tenantDb() conversion wrong-tenant probe
 * (P1/W1 backlog batch). The `clients` audience query previously carried its
 * own manual `.eq('tenant_id', tenantId)`; that filter now comes solely from
 * the wrapper — this proves tenant B's clients never leak into tenant A's
 * campaign audience count or preview list. (The `contact_filter` `bookings`
 * lookup is converted too, but a leak there can't be observed by unit test —
 * classification is applied only over the already tenant-scoped client list,
 * so this is defense-in-depth, not a closed gap.)
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
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { name: 'Tenant ' + h.tenantId, primary_color: '#000000' },
    role: 'owner',
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Alice', email: 'a@x.com', phone: '+15551110001', email_marketing_opt_out: false, sms_marketing_opt_out: false, status: 'active', do_not_service: false, created_at: '2026-01-01' },
      { id: 'client-B1', tenant_id: 'tenant-B', name: 'Bob', email: 'b@x.com', phone: '+15552220002', email_marketing_opt_out: false, sms_marketing_opt_out: false, status: 'active', do_not_service: false, created_at: '2026-01-01' },
    ],
    bookings: [
      { client_id: 'client-A1', tenant_id: 'tenant-A', status: 'completed', start_time: '2026-01-01T10:00:00', recurring_type: null, price: 10000 },
      { client_id: 'client-B1', tenant_id: 'tenant-B', status: 'completed', start_time: '2026-01-01T10:00:00', recurring_type: null, price: 500000 },
    ],
  }
})

describe('POST /api/admin/campaigns/preview — tenant isolation', () => {
  it("tenant A's audience count only includes tenant A's clients", async () => {
    const res = await POST(postReq({ audience_filter: 'all', channel: 'email' }))
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.totalClients).toBe(1)
    expect(json.clients.map((c: { id: string }) => c.id)).toEqual(['client-A1'])
  })

  it("tenant B's preview only sees tenant B's client", async () => {
    h.tenantId = 'tenant-B'
    const res = await POST(postReq({ audience_filter: 'all', channel: 'email' }))
    const json = await res.json()

    expect(json.clients.map((c: { id: string }) => c.id)).toEqual(['client-B1'])
  })
})
