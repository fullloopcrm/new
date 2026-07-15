import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/deals/[id] PATCH.
 *
 * client_id is a caller-supplied FK with no cross-tenant check at the DB
 * layer, and every read of this route (and /api/deals) joins clients(...) by
 * that id unscoped by tenant. Before this fix, PATCHing a deal's client_id to
 * a FOREIGN tenant's client id would silently attach it — leaking that
 * tenant's client name/email/phone/address into the caller's pipeline on the
 * next read. The route now verifies ownership before allowing the update.
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

import { PATCH } from './route'

function seed() {
  return {
    deals: [{ id: 'deal-a1', tenant_id: A, title: 'A Deal', client_id: null }],
    deal_activities: [] as Record<string, unknown>[],
    clients: [
      { id: 'client-a', tenant_id: A, name: 'Mine Client' },
      { id: 'client-b', tenant_id: B, name: 'Theirs Client' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as Request
}
function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('deals/[id] PATCH — client_id ownership', () => {
  it("WRONG-TENANT PROBE: PATCH with a foreign tenant's client_id is rejected, not applied", async () => {
    const res = await PATCH(req({ client_id: 'client-b' }), params('deal-a1'))
    expect(res.status).toBe(404)

    const deal = h.seed.deals.find((d) => d.id === 'deal-a1')!
    expect(deal.client_id).toBe(null)
  })

  it("PATCH with the acting tenant's own client_id succeeds", async () => {
    const res = await PATCH(req({ client_id: 'client-a' }), params('deal-a1'))
    expect(res.status).toBe(200)

    const deal = h.seed.deals.find((d) => d.id === 'deal-a1')!
    expect(deal.client_id).toBe('client-a')
  })

  it('PATCH without client_id in the body is unaffected by the ownership check', async () => {
    const res = await PATCH(req({ title: 'Renamed' }), params('deal-a1'))
    expect(res.status).toBe(200)

    const deal = h.seed.deals.find((d) => d.id === 'deal-a1')!
    expect(deal.title).toBe('Renamed')
  })
})
