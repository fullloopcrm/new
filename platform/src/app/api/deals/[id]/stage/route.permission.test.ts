import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/deals/[id]/stage — sales.edit gate (broad-hunt: pipeline stage
 * transitions had zero permission check, only base tenant auth via
 * getTenantForRequest()). RBAC (rbac.ts) grants 'staff' only sales.view, not
 * sales.edit — the pipeline UI (dashboard/sales/pipeline) has no client-side
 * role gate either, so before this fix a staff member could drag/drop (or
 * curl) any deal through the whole pipeline, including force-closing it
 * sold/lost, with zero server-side check. 'manager'+ have sales.edit and must
 * keep working.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: null },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    deals: [{ id: 'deal-A1', tenant_id: 'tenant-A', stage: 'new', title: 'A Deal', value_cents: 1000, probability: 10 }],
    deal_activities: [],
  }
})

describe('POST /api/deals/:id/stage — sales.edit permission', () => {
  it('rejects a staff member (sales.view only) with 403 and leaves the stage untouched', async () => {
    const res = await POST(postReq({ stage: 'sold' }), params('deal-A1'))

    expect(res.status).toBe(403)
    expect(h.store.deals.find((d) => d.id === 'deal-A1')?.stage).toBe('new')
  })

  it('allows a manager (has sales.edit) to move the stage', async () => {
    h.role = 'manager'
    const res = await POST(postReq({ stage: 'sold' }), params('deal-A1'))

    expect(res.status).toBe(200)
    expect(h.store.deals.find((d) => d.id === 'deal-A1')?.stage).toBe('sold')
  })

  it('allows an owner to move the stage', async () => {
    h.role = 'owner'
    const res = await POST(postReq({ stage: 'lost' }), params('deal-A1'))

    expect(res.status).toBe(200)
    expect(h.store.deals.find((d) => d.id === 'deal-A1')?.stage).toBe('lost')
  })
})
