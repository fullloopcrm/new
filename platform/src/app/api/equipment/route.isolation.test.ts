import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/equipment (base CRUD, tenantDb-backed).
 *
 * service_type_id/category_id are plain uuid PKs with no cross-tenant FK
 * constraint at the DB level -- verify each belongs to this tenant before
 * linking a physical asset to it. Same cross-tenant-reference class already
 * fixed on job-expenses/quote-budgets/equipment-bookings/catalog-materials/
 * catalog (category_id).
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, role: 'owner' }, error: null })),
}))

import { GET, POST, PATCH } from './route'

function seed() {
  return {
    equipment: [{ id: 'eq-a1', tenant_id: A, name: 'Skid Steer', service_type_id: null, category_id: null, status: 'available', active: true }],
    service_types: [
      { id: 'svc-a1', tenant_id: A, name: 'Dumpster Rental' },
      { id: 'svc-b1', tenant_id: B, name: 'Foreign Service' },
    ],
    categories: [
      { id: 'cat-a1', tenant_id: A, name: 'Heavy Equipment' },
      { id: 'cat-b1', tenant_id: B, name: 'Foreign Category' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('equipment — cross-tenant reference isolation', () => {
  it('POST rejects a service_type_id belonging to another tenant, no row created', async () => {
    const req = new Request('http://t/api/equipment', {
      method: 'POST',
      body: JSON.stringify({ name: 'Rig', service_type_id: 'svc-b1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(h.capture.inserts.filter((i) => i.table === 'equipment')).toHaveLength(0)
  })

  it('POST rejects a category_id belonging to another tenant', async () => {
    const req = new Request('http://t/api/equipment', {
      method: 'POST',
      body: JSON.stringify({ name: 'Rig', category_id: 'cat-b1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(h.capture.inserts.filter((i) => i.table === 'equipment')).toHaveLength(0)
  })

  it("POST accepts the acting tenant's own service_type_id/category_id", async () => {
    const req = new Request('http://t/api/equipment', {
      method: 'POST',
      body: JSON.stringify({ name: 'Rig', service_type_id: 'svc-a1', category_id: 'cat-a1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const inserted = h.capture.inserts.find((i) => i.table === 'equipment')
    expect(inserted!.rows[0].service_type_id).toBe('svc-a1')
    expect(inserted!.rows[0].category_id).toBe('cat-a1')
  })

  it('PATCH rejects reassigning equipment to a foreign service_type_id', async () => {
    const req = new Request('http://t/api/equipment', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'eq-a1', service_type_id: 'svc-b1' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(h.capture.updates.filter((u) => u.table === 'equipment')).toHaveLength(0)
  })

  it('PATCH rejects reassigning equipment to a foreign category_id', async () => {
    const req = new Request('http://t/api/equipment', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'eq-a1', category_id: 'cat-b1' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(h.capture.updates.filter((u) => u.table === 'equipment')).toHaveLength(0)
  })

  it('GET only returns the acting tenant\'s own equipment', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect((body.equipment as Array<{ id: string }>).map((e) => e.id)).toEqual(['eq-a1'])
  })
})
