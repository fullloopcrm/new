import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST/PATCH/DELETE /api/inventory — inventory.view/inventory.edit gate,
 * plus tenant scoping (a caller from tenant B must never see/mutate tenant A's
 * stock).
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

import { GET, POST, PATCH, DELETE } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    inventory_items: [{ id: 'inv-1', tenant_id: 'tenant-A', name: 'HEPA Filter', sku: 'HEPA-1', quantity_on_hand: 10, unit_cost_cents: 500, reorder_threshold: 2, active: true }],
  }
})

describe('GET /api/inventory — inventory.view permission', () => {
  it('rejects a role with no inventory.view with 403', async () => {
    h.role = 'nobody'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows staff (has inventory.view) to list items', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/inventory — inventory.edit permission', () => {
  it('rejects a staff member (no inventory.edit) with 403 and does not insert', async () => {
    const res = await POST(new Request('http://x/api/inventory', { method: 'POST', body: JSON.stringify({ name: 'New Item' }) }))
    expect(res.status).toBe(403)
    expect(h.store.inventory_items.length).toBe(1)
  })

  it('allows a manager (has inventory.edit) to create an item', async () => {
    h.role = 'manager'
    const res = await POST(new Request('http://x/api/inventory', { method: 'POST', body: JSON.stringify({ name: 'New Item' }) }))
    expect(res.status).toBe(200)
    expect(h.store.inventory_items.length).toBe(2)
  })
})

describe('PATCH /api/inventory — inventory.edit permission', () => {
  it('rejects a staff member (no inventory.edit) with 403 and does not mutate', async () => {
    const res = await PATCH(new Request('http://x/api/inventory', { method: 'PATCH', body: JSON.stringify({ id: 'inv-1', name: 'Hacked' }) }))
    expect(res.status).toBe(403)
    expect(h.store.inventory_items[0].name).toBe('HEPA Filter')
  })

  it('allows an owner to edit an item', async () => {
    h.role = 'owner'
    const res = await PATCH(new Request('http://x/api/inventory', { method: 'PATCH', body: JSON.stringify({ id: 'inv-1', quantity_on_hand: 3 }) }))
    expect(res.status).toBe(200)
    expect(h.store.inventory_items[0].quantity_on_hand).toBe(3)
  })

  it('does not let a caller patch another tenant\'s item', async () => {
    h.role = 'owner'
    h.tenantId = 'tenant-B'
    const res = await PATCH(new Request('http://x/api/inventory', { method: 'PATCH', body: JSON.stringify({ id: 'inv-1', name: 'Cross-tenant' }) }))
    expect(res.status).toBe(500)
    expect(h.store.inventory_items[0].name).toBe('HEPA Filter')
  })
})

describe('DELETE /api/inventory — inventory.edit permission', () => {
  it('rejects a staff member (no inventory.edit) with 403 and does not delete', async () => {
    const res = await DELETE(new Request('http://x/api/inventory?id=inv-1', { method: 'DELETE' }))
    expect(res.status).toBe(403)
    expect(h.store.inventory_items.length).toBe(1)
  })

  it('allows an admin to delete an item', async () => {
    h.role = 'admin'
    const res = await DELETE(new Request('http://x/api/inventory?id=inv-1', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(h.store.inventory_items.length).toBe(0)
  })
})
