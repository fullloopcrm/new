import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/tenants/[id] — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Platform-admin tenant detail view; members/counts/
 * revenue must scope strictly to the URL id, never leaking a sibling
 * tenant's rows into the response.
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
      { id: 'tenant-A', name: 'Acme A' },
      { id: 'tenant-B', name: 'Acme B' },
    ],
    tenant_members: [
      { id: 'm-A1', tenant_id: 'tenant-A' },
      { id: 'm-B1', tenant_id: 'tenant-B' },
      { id: 'm-B2', tenant_id: 'tenant-B' },
    ],
    clients: [{ id: 'c-A1', tenant_id: 'tenant-A' }],
    bookings: [
      { id: 'b-A1', tenant_id: 'tenant-A', status: 'completed', final_price: 50 },
      { id: 'b-B1', tenant_id: 'tenant-B', status: 'completed', final_price: 7777 },
    ],
    team_members: [],
  }
})

describe('GET /api/admin/tenants/[id] — tenant isolation', () => {
  it("tenant A's detail view never includes tenant B's members, counts, or revenue", async () => {
    const res = await GET(new Request('http://x'), { params: params('tenant-A') })
    const json = await res.json()

    expect(json.members.map((m: { id: string }) => m.id)).toEqual(['m-A1'])
    expect(json.stats.clients).toBe(1)
    expect(json.stats.bookings).toBe(1)
    expect(json.stats.revenue).toBe(50)
    expect(JSON.stringify(json)).not.toContain('7777')
  })

  it("tenant B's detail view is scoped to B's own members and revenue", async () => {
    const res = await GET(new Request('http://x'), { params: params('tenant-B') })
    const json = await res.json()

    expect(json.members.map((m: { id: string }) => m.id).sort()).toEqual(['m-B1', 'm-B2'])
    expect(json.stats.revenue).toBe(7777)
  })
})
