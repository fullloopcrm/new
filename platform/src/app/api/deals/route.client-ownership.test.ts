import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * client_id is a caller-supplied FK on POST /api/deals — clients has no
 * cross-tenant FK check at the DB layer, and every read of this route (and
 * GET/PATCH /api/deals/[id]) joins clients(id, name, email, phone, address)
 * unscoped by tenant. Before this fix, attaching a FOREIGN tenant's client_id
 * to a deal would silently succeed, leaking that tenant's client PII back on
 * the next read.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId }))
  h.store = {
    clients: [
      { id: 'client-A', tenant_id: 'tenant-A', name: 'Mine Client' },
      { id: 'client-B', tenant_id: 'tenant-B', name: 'Theirs Client' },
    ],
    deals: [],
    deal_activities: [],
  }
})

describe('POST /api/deals — client_id ownership', () => {
  it("rejects a foreign tenant's client_id and does not insert a deal", async () => {
    const res = await POST(postReq({ client_id: 'client-B', title: 'Attack' }))

    expect(res.status).toBe(404)
    expect(h.store.deals).toHaveLength(0)
  })

  it("accepts the acting tenant's own client_id", async () => {
    const res = await POST(postReq({ client_id: 'client-A', title: 'Legit' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.client_id).toBe('client-A')
    expect(h.store.deals).toHaveLength(1)
  })

  it('a title-only deal (no client_id) is unaffected by the ownership check', async () => {
    const res = await POST(postReq({ title: 'No client yet' }))

    expect(res.status).toBe(200)
    expect(h.store.deals).toHaveLength(1)
  })
})
