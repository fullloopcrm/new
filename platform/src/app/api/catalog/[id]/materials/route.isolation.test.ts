import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Tenant isolation — POST /api/catalog/[id]/materials.
 *
 * Two cross-tenant reference gaps, same class as the job-expenses/
 * quote-budgets/budget-templates fixes this session:
 *
 * 1) body.inventory_item_id went straight into the upsert with no ownership
 *    check. GET's own select embeds inventory_items(id, name, unit_label,
 *    unit_cost_cents) with no additional tenant filter -- a caller who
 *    supplied another tenant's real inventory_item_id would have that
 *    foreign item's name/cost render on their own catalog item's BOM list.
 *    An ACTUAL read-leak, not just write-pollution (the embed already
 *    exists in this same file's GET).
 *
 * 2) the [id] URL param (service_type_id) was never verified to belong to
 *    this tenant either -- a caller could attach a materials/BOM row to
 *    another tenant's service type.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId = 'tenant-A'
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A = 'tenant-A'
const B = 'tenant-B'
const SVC_A = '00000000-0000-0000-0000-0000000000a1'
const SVC_B = '00000000-0000-0000-0000-0000000000b1'
const ITEM_A = '00000000-0000-0000-0000-0000000000a2'
const ITEM_B = '00000000-0000-0000-0000-0000000000b2'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A
  fake._seed('service_types', [
    { id: SVC_A, tenant_id: A, name: 'A Service' },
    { id: SVC_B, tenant_id: B, name: 'B Secret Service' },
  ])
  fake._seed('inventory_items', [
    { id: ITEM_A, tenant_id: A, name: 'A Item', unit_label: 'ea', unit_cost_cents: 100 },
    { id: ITEM_B, tenant_id: B, name: 'B Secret Item', unit_label: 'ea', unit_cost_cents: 999 },
  ])
})

function post(serviceTypeId: string, body: unknown) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: serviceTypeId }),
  })
}

describe('POST /api/catalog/[id]/materials — cross-tenant reference isolation', () => {
  it("REJECTS an inventory_item_id belonging to another tenant, no material row created", async () => {
    const res = await post(SVC_A, { inventory_item_id: ITEM_B, qty_per_unit: 2 })
    expect(res.status).toBe(400)
    expect(fake._all('catalog_item_materials')).toHaveLength(0)
  })

  it('REJECTS attaching a BOM entry to another tenant\'s service type (the URL id param)', async () => {
    const res = await post(SVC_B, { inventory_item_id: ITEM_A, qty_per_unit: 2 })
    expect(res.status).toBe(400)
    expect(fake._all('catalog_item_materials')).toHaveLength(0)
  })

  it("positive control: the SAME tenant's own service_type/inventory_item ids are accepted", async () => {
    const res = await post(SVC_A, { inventory_item_id: ITEM_A, qty_per_unit: 2 })
    expect(res.status).toBe(200)
    expect(fake._all('catalog_item_materials')).toHaveLength(1)
  })
})
