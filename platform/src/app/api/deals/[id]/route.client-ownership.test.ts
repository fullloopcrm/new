import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * client_id is a caller-supplied FK on PATCH /api/deals/[id] — clients has no
 * cross-tenant FK check at the DB layer, and GET/PATCH both join clients(id,
 * name, email, phone, address) unscoped by tenant. Before this fix, PATCHing
 * a deal's client_id to a FOREIGN tenant's client id would silently attach
 * it, leaking that tenant's client PII back on the next read (including this
 * same PATCH's own response).
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

import { PATCH } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, tenant: {}, role: 'owner' }))
  h.store = {
    clients: [
      { id: 'client-A', tenant_id: 'tenant-A', name: 'Mine Client' },
      { id: 'client-B', tenant_id: 'tenant-B', name: 'Theirs Client' },
    ],
    deals: [{ id: 'deal-A1', tenant_id: 'tenant-A', title: 'A Deal', client_id: null }],
    deal_activities: [],
  }
})

describe('PATCH /api/deals/:id — client_id ownership', () => {
  it("rejects a foreign tenant's client_id and leaves the deal's client_id untouched", async () => {
    const res = await PATCH(patchReq({ client_id: 'client-B' }), params('deal-A1'))

    expect(res.status).toBe(404)
    expect(h.store.deals.find((d) => d.id === 'deal-A1')?.client_id).toBeNull()
  })

  it("accepts the acting tenant's own client_id", async () => {
    const res = await PATCH(patchReq({ client_id: 'client-A' }), params('deal-A1'))

    expect(res.status).toBe(200)
    expect(h.store.deals.find((d) => d.id === 'deal-A1')?.client_id).toBe('client-A')
  })

  it('a PATCH without client_id in the body is unaffected by the ownership check', async () => {
    const res = await PATCH(patchReq({ title: 'Renamed' }), params('deal-A1'))

    expect(res.status).toBe(200)
    expect(h.store.deals.find((d) => d.id === 'deal-A1')?.title).toBe('Renamed')
  })
})
