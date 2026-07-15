import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST/PATCH/DELETE /api/catalog — sales.view/sales.edit gate.
 *
 * All four methods only called getTenantForRequest() (base session auth)
 * with no requirePermission check — any authenticated tenant member of any
 * role could create/edit/delete priced catalog items (service_types) feeding
 * the sales quote builder, unlike the sibling sales routes (/api/deals,
 * /api/quotes) gated on 'sales.view'/'sales.edit'. Per rbac.ts, 'staff' has
 * sales.view but lacks sales.edit — manager/admin/owner keep working.
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
    service_types: [{ id: 'svc-1', tenant_id: 'tenant-A', name: 'Deep Clean', price_cents: 10000 }],
  }
})

describe('GET /api/catalog — sales.view permission', () => {
  it('rejects a role with no sales.view with 403', async () => {
    h.role = 'nobody'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows staff (has sales.view) to list catalog items', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/catalog — sales.edit permission', () => {
  it('rejects a staff member (no sales.edit) with 403 and does not insert', async () => {
    const res = await POST(new Request('http://x/api/catalog', { method: 'POST', body: JSON.stringify({ name: 'New Item' }) }))
    expect(res.status).toBe(403)
    expect(h.store.service_types.length).toBe(1)
  })

  it('allows a manager (has sales.edit) to create an item', async () => {
    h.role = 'manager'
    const res = await POST(new Request('http://x/api/catalog', { method: 'POST', body: JSON.stringify({ name: 'New Item' }) }))
    expect(res.status).toBe(200)
    expect(h.store.service_types.length).toBe(2)
  })
})

describe('PATCH /api/catalog — sales.edit permission', () => {
  it('rejects a staff member (no sales.edit) with 403 and does not mutate', async () => {
    const res = await PATCH(new Request('http://x/api/catalog', { method: 'PATCH', body: JSON.stringify({ id: 'svc-1', name: 'Hacked' }) }))
    expect(res.status).toBe(403)
    expect(h.store.service_types[0].name).toBe('Deep Clean')
  })

  it('allows an owner to edit an item', async () => {
    h.role = 'owner'
    const res = await PATCH(new Request('http://x/api/catalog', { method: 'PATCH', body: JSON.stringify({ id: 'svc-1', name: 'Renamed' }) }))
    expect(res.status).toBe(200)
    expect(h.store.service_types[0].name).toBe('Renamed')
  })
})

describe('DELETE /api/catalog — sales.edit permission', () => {
  it('rejects a staff member (no sales.edit) with 403 and does not delete', async () => {
    const res = await DELETE(new Request('http://x/api/catalog?id=svc-1', { method: 'DELETE' }))
    expect(res.status).toBe(403)
    expect(h.store.service_types.length).toBe(1)
  })

  it('allows an admin to delete an item', async () => {
    h.role = 'admin'
    const res = await DELETE(new Request('http://x/api/catalog?id=svc-1', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(h.store.service_types.length).toBe(0)
  })
})
