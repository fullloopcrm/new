import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/geocode-backfill — tenantDb() conversion wrong-tenant probe
 * (P1/W1 backlog batch). Backfill previously carried its own manual
 * `.eq('tenant_id', tenantId)` on every select/update; that filter now comes
 * solely from the wrapper — this proves a same-address, same-null-latitude
 * row belonging to another tenant is never read or written.
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))
vi.mock('@/lib/geo', () => ({
  geocodeAddress: async (address: string) => ({ lat: 40.0, lng: -74.0, source: address }),
}))

import { POST } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', address: '1 Main St', latitude: null },
      { id: 'client-B1', tenant_id: 'tenant-B', address: '2 Main St', latitude: null },
    ],
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', address: '3 Main St', home_latitude: null },
      { id: 'tm-B1', tenant_id: 'tenant-B', address: '4 Main St', home_latitude: null },
    ],
  }
})

describe('POST /api/admin/geocode-backfill — tenant isolation', () => {
  it("tenant A's backfill geocodes its own client, never tenant B's", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.clientsGeocoded).toBe(1)

    const clientA = h.store.clients.find((c) => c.id === 'client-A1')
    const clientB = h.store.clients.find((c) => c.id === 'client-B1')
    expect(clientA?.latitude).toBe(40.0)
    expect(clientB?.latitude).toBeNull()
  })

  it("tenant A's backfill geocodes its own team member, never tenant B's", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.teamGeocoded).toBe(1)

    const tmA = h.store.team_members.find((m) => m.id === 'tm-A1')
    const tmB = h.store.team_members.find((m) => m.id === 'tm-B1')
    expect(tmA?.home_latitude).toBe(40.0)
    expect(tmB?.home_latitude).toBeNull()
  })

  it("running for tenant B only touches tenant B's rows", async () => {
    h.tenantId = 'tenant-B'
    await POST()

    const clientA = h.store.clients.find((c) => c.id === 'client-A1')
    const clientB = h.store.clients.find((c) => c.id === 'client-B1')
    expect(clientB?.latitude).toBe(40.0)
    expect(clientA?.latitude).toBeNull()
  })
})
