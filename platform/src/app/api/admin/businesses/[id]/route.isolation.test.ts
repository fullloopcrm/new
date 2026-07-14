import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/businesses/[id] — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Platform-admin drill-down into a single tenant's stats;
 * the id in the URL becomes the tenantDb() scope for every tenant-owned
 * table (tenant_members/tenant_invites/clients/bookings/team_members).
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))

import { GET } from './route'

const params = (id: string) => Promise.resolve({ id })

beforeEach(() => {
  h.seq = 0
  h.store = {
    tenants: [
      { id: 'tenant-A', name: 'Acme A', setup_progress: {} },
      { id: 'tenant-B', name: 'Acme B', setup_progress: {} },
    ],
    tenant_members: [
      { id: 'm-A1', tenant_id: 'tenant-A' },
      { id: 'm-B1', tenant_id: 'tenant-B' },
    ],
    tenant_invites: [
      { id: 'i-A1', tenant_id: 'tenant-A', created_at: '2026-01-01' },
      { id: 'i-B1', tenant_id: 'tenant-B', created_at: '2026-01-01' },
    ],
    clients: [
      { id: 'c-A1', tenant_id: 'tenant-A' },
      { id: 'c-B1', tenant_id: 'tenant-B' },
      { id: 'c-B2', tenant_id: 'tenant-B' },
    ],
    bookings: [
      { id: 'b-A1', tenant_id: 'tenant-A', status: 'completed', final_price: 100 },
      { id: 'b-B1', tenant_id: 'tenant-B', status: 'completed', final_price: 9999 },
    ],
    team_members: [{ id: 't-B1', tenant_id: 'tenant-B' }],
    service_types: [],
  }
})

describe('GET /api/admin/businesses/[id] — tenant isolation', () => {
  it("tenant A's drill-down never counts or returns tenant B's rows", async () => {
    const res = await GET(new Request('http://x'), { params: params('tenant-A') })
    const json = await res.json()

    expect(json.members.map((m: { id: string }) => m.id)).toEqual(['m-A1'])
    expect(json.invites.map((i: { id: string }) => i.id)).toEqual(['i-A1'])
    expect(json.stats.clients).toBe(1)
    expect(json.stats.bookings).toBe(1)
    expect(json.stats.team_members).toBe(0)
    expect(json.stats.revenue).toBe(100)
    expect(JSON.stringify(json)).not.toContain('9999')
  })

  it("tenant B's drill-down is scoped to B and excludes A", async () => {
    const res = await GET(new Request('http://x'), { params: params('tenant-B') })
    const json = await res.json()

    expect(json.members.map((m: { id: string }) => m.id)).toEqual(['m-B1'])
    expect(json.stats.clients).toBe(2)
    expect(json.stats.team_members).toBe(1)
    expect(json.stats.revenue).toBe(9999)
  })
})
