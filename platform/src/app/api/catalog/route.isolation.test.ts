import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/catalog (converted to tenantDb).
 *
 * The catalog is a single-table CRUD surface over `service_types`. Every
 * method now goes through tenantDb, so:
 *   • GET lists only the acting tenant's items (a foreign tenant's item never
 *     appears).
 *   • POST stamps tenant_id from context — a forged body tenant_id can't cross.
 *   • PATCH/DELETE address a row by id but tenantDb injects .eq('tenant_id'),
 *     so a foreign id matches no row (no cross-tenant edit/delete).
 *
 * Regression: DELETE used to report `{ ok: true }` unconditionally even when
 * the tenant filter silently matched zero rows for a foreign id — same
 * response-honesty bug class as the admin/ai-chat update/cancel_bookings fix.
 * Fixed by chaining `.select('id')` on the delete and checking the match count.
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

import { GET, POST, PATCH, DELETE } from './route'

function seed() {
  return {
    service_types: [
      { id: 'svc-a1', tenant_id: A, name: 'Standard Clean', item_type: 'service', per_unit: 'hour', price_cents: 5000, default_hourly_rate: null, sort_order: 1, active: true, category_id: null },
      { id: 'svc-b1', tenant_id: B, name: 'Foreign Deep Clean', item_type: 'service', per_unit: 'job', price_cents: 9900, default_hourly_rate: null, sort_order: 1, active: true, category_id: null },
    ],
    categories: [
      { id: 'cat-a1', tenant_id: A, name: 'A Category' },
      { id: 'cat-b1', tenant_id: B, name: 'B Category' },
    ],
    audit_logs: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('catalog — tenant isolation', () => {
  it("GET excludes a foreign tenant's items", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.items as Array<{ id: string }>).map((i) => i.id)
    expect(ids).toEqual(['svc-a1'])
    expect(ids).not.toContain('svc-b1')
  })

  it('POST stamps the acting tenant (ignores a forged body tenant_id)', async () => {
    const req = new Request('http://t/api/catalog', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Item', tenant_id: B }), // forged foreign tenant
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const inserted = h.capture.inserts.find((i) => i.table === 'service_types')
    expect(inserted).toBeTruthy()
    expect(inserted!.rows[0].tenant_id).toBe(A) // stamp wins over forged B
  })

  it('PATCH cannot edit a foreign tenant item', async () => {
    const req = new Request('http://t/api/catalog', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'svc-b1', name: 'HIJACKED' }),
    })
    // foreign id matches no row for tenant A → .single() errors → 500, no write
    const res = await PATCH(req)
    expect(res.status).toBe(500)
    const updates = h.capture.updates.filter((u) => u.table === 'service_types')
    expect(updates.every((u) => u.matched.length === 0)).toBe(true)
    expect(h.seed.service_types.find((r) => r.id === 'svc-b1')!.name).toBe('Foreign Deep Clean')
  })

  it('wrong-tenant probe: DELETE of a foreign tenant item reports 404, not ok:true', async () => {
    const res = await DELETE(new Request('http://t/api/catalog?id=svc-b1', { method: 'DELETE' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.ok).not.toBe(true)
    const deletes = h.capture.deletes.filter((d) => d.table === 'service_types')
    expect(deletes.every((d) => d.matched.length === 0)).toBe(true)
    // foreign row survives
    expect(h.seed.service_types.some((r) => r.id === 'svc-b1')).toBe(true)
  })

  it("DELETE removes the acting tenant's own item and reports ok:true", async () => {
    const res = await DELETE(new Request('http://t/api/catalog?id=svc-a1', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(h.seed.service_types.some((r) => r.id === 'svc-a1')).toBe(false)
  })

  it('POST rejects a category_id belonging to another tenant', async () => {
    const req = new Request('http://t/api/catalog', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Item', category_id: 'cat-b1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'service_types')).toBeUndefined()
  })

  it('POST accepts a category_id belonging to the acting tenant (positive control)', async () => {
    const req = new Request('http://t/api/catalog', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Item', category_id: 'cat-a1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const inserted = h.capture.inserts.find((i) => i.table === 'service_types')
    expect(inserted!.rows[0].category_id).toBe('cat-a1')
  })

  it('PATCH rejects a category_id belonging to another tenant and leaves the item unchanged', async () => {
    const req = new Request('http://t/api/catalog', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'svc-a1', category_id: 'cat-b1' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(h.seed.service_types.find((r) => r.id === 'svc-a1')!.category_id).toBe(null)
  })
})
