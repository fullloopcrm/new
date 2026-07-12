import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/clients/[id] (GET + PUT + DELETE, converted to tenantDb).
 *
 * Every access is scoped to the acting tenant, so a client id that belongs to a
 * DIFFERENT tenant is treated as not-found and can never be read, updated, or
 * deleted across the tenant boundary.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { GET, PUT, DELETE } from './route'

function seed() {
  return {
    clients: [
      { id: 'cli-a', tenant_id: A, name: 'A Client', status: 'active' },
      { id: 'cli-b', tenant_id: B, name: 'B Client', status: 'active' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('clients/[id] — tenant isolation', () => {
  it('GET of a foreign tenant client id is 404', async () => {
    const res = await GET(new Request('http://t/api/clients/cli-b'), params('cli-b'))
    expect(res.status).toBe(404)
  })

  it("GET of the acting tenant's own client returns it", async () => {
    const res = await GET(new Request('http://t/api/clients/cli-a'), params('cli-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client.id).toBe('cli-a')
  })

  it('PUT never mutates a foreign tenant client', async () => {
    await PUT(
      new Request('http://t/api/clients/cli-b', { method: 'PUT', body: JSON.stringify({ name: 'HIJACK' }) }),
      params('cli-b'),
    )
    const b = (h.seed.clients as Array<{ id: string; name: string }>).find((r) => r.id === 'cli-b')
    expect(b?.name).toBe('B Client')
  })

  it('DELETE never removes a foreign tenant client', async () => {
    await DELETE(new Request('http://t/api/clients/cli-b', { method: 'DELETE' }), params('cli-b'))
    const b = (h.seed.clients as Array<{ id: string }>).find((r) => r.id === 'cli-b')
    expect(b).toBeDefined()
  })
})
