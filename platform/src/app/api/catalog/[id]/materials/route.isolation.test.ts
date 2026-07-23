import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * Tenant isolation — POST /api/catalog/:id/materials.
 * inventory_item_id came from the request body with no ownership check;
 * this route's own GET/POST embed inventory_items(name, unit_cost_cents)
 * with no additional tenant filter on the join -- a foreign inventory_item_id
 * would leak that tenant's item name/cost onto this tenant's own BOM. Same
 * class as job-expenses' vendor_id/service_type_id fix.
 */

const SVC_A = '00000000-0000-0000-0000-0000000000a1'
const ITEM_A = '00000000-0000-0000-0000-0000000000a2'
const ITEM_B = '00000000-0000-0000-0000-0000000000b2'

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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = { params: Promise.resolve({ id: SVC_A }) }

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    inventory_items: [
      { id: ITEM_A, tenant_id: 'tenant-A', name: 'A Item', unit_cost_cents: 100 },
      { id: ITEM_B, tenant_id: 'tenant-B', name: 'B Secret Item', unit_cost_cents: 999 },
    ],
    catalog_item_materials: [],
  }
})

describe('POST /api/catalog/:id/materials — cross-tenant reference isolation', () => {
  it("REJECTS an inventory_item_id belonging to another tenant, no row created", async () => {
    const res = await POST(postReq({ inventory_item_id: ITEM_B, qty_per_unit: 2 }), params)
    expect(res.status).toBe(400)
    expect(h.store.catalog_item_materials).toHaveLength(0)
  })

  it("positive control: the same tenant's own inventory_item_id is accepted", async () => {
    const res = await POST(postReq({ inventory_item_id: ITEM_A, qty_per_unit: 2 }), params)
    expect(res.status).toBe(200)
    expect(h.store.catalog_item_materials).toHaveLength(1)
  })
})
