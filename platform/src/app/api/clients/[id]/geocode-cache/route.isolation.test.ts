import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/clients/[id]/geocode-cache -- p1-w1 queue item 3 (Map view
 * re-geocoded every address on every load instead of caching). This route
 * persists a freshly-geocoded lat/lng so the next map load (or scheduler run)
 * reads the cache instead of hitting the geocoder again -- must be
 * tenant-scoped like every other client mutation.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { POST } from './route'

function seed() {
  return {
    clients: [
      { id: 'cli-a', tenant_id: A, name: 'A Client', latitude: null, longitude: null },
      { id: 'cli-b', tenant_id: B, name: 'B Client', latitude: null, longitude: null },
    ],
    client_properties: [
      { id: 'prop-a', tenant_id: A, client_id: 'cli-a', address: '1 Main St', latitude: null, longitude: null },
      { id: 'prop-b', tenant_id: B, client_id: 'cli-b', address: '2 Other St', latitude: null, longitude: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://t/x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/clients/[id]/geocode-cache', () => {
  it('persists lat/lng on the client row when no property_id is given', async () => {
    const res = await POST(postReq({ lat: 40.7, lng: -74.0 }), params('cli-a'))
    expect(res.status).toBe(200)
    const row = (h.seed.clients as Array<{ id: string; latitude: number | null; longitude: number | null }>).find((r) => r.id === 'cli-a')
    expect(row?.latitude).toBe(40.7)
    expect(row?.longitude).toBe(-74.0)
  })

  it('persists lat/lng on the client_properties row when property_id is given', async () => {
    const res = await POST(postReq({ lat: 40.8, lng: -73.9, property_id: 'prop-a' }), params('cli-a'))
    expect(res.status).toBe(200)
    const row = (h.seed.client_properties as Array<{ id: string; latitude: number | null; longitude: number | null }>).find((r) => r.id === 'prop-a')
    expect(row?.latitude).toBe(40.8)
    expect(row?.longitude).toBe(-73.9)
    // Client's own row is untouched -- the property row is the cache target.
    const client = (h.seed.clients as Array<{ id: string; latitude: number | null }>).find((r) => r.id === 'cli-a')
    expect(client?.latitude).toBeNull()
  })

  it('rejects a property_id belonging to another client (never leaks cross-client writes)', async () => {
    const res = await POST(postReq({ lat: 1, lng: 1, property_id: 'prop-b' }), params('cli-a'))
    expect(res.status).toBe(404)
    const row = (h.seed.client_properties as Array<{ id: string; latitude: number | null }>).find((r) => r.id === 'prop-b')
    expect(row?.latitude).toBeNull()
  })

  it('a foreign-tenant client id is 404 and never written', async () => {
    const res = await POST(postReq({ lat: 1, lng: 1 }), params('cli-b'))
    expect(res.status).toBe(404)
    const row = (h.seed.clients as Array<{ id: string; latitude: number | null }>).find((r) => r.id === 'cli-b')
    expect(row?.latitude).toBeNull()
  })

  it('rejects a request missing lat/lng', async () => {
    const res = await POST(postReq({}), params('cli-a'))
    expect(res.status).toBe(400)
  })
})
