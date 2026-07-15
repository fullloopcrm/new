import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard — tenantDb() conversion wrong-tenant probe (P1/W1 backlog
 * batch). This is the operator dashboard aggregator: 15 parallel queries
 * previously each carried their own manual `.eq('tenant_id', tenantId)`;
 * that filter now comes solely from the wrapper. Verifies tenant A's
 * aggregate numbers/lists never fold in tenant B's bookings/clients/team.
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', start_time: iso(0), status: 'completed', payment_status: 'paid', price: 100 },
      { id: 'book-B1', tenant_id: 'tenant-B', start_time: iso(0), status: 'completed', payment_status: 'paid', price: 999999 },
    ],
    clients: [
      { id: 'cli-A1', tenant_id: 'tenant-A', created_at: iso(0) },
      { id: 'cli-B1', tenant_id: 'tenant-B', created_at: iso(0) },
    ],
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alex', status: 'active' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Evil', status: 'active' },
    ],
  }
})

describe('GET /api/dashboard — tenant isolation', () => {
  it("tenant A's today financials never fold in tenant B's booking price", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(100)
    expect(json.financials.today.jobs).toBe(1)
  })

  it("tenant A's client count never includes tenant B's clients", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.clients.total).toBe(1)
  })

  it("tenant A's team member list never includes tenant B's team members", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.teamMembers.map((t: { id: string }) => t.id)).toEqual(['tm-A1'])
    expect(JSON.stringify(json)).not.toContain('Evil')
  })

  it("tenant B's own request sees only its own booking, never tenant A's", async () => {
    h.tenantId = 'tenant-B'
    const res = await GET()
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(999999)
  })
})
