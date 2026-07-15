import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/settings/services (converted to tenantDb).
 *
 * GET lists `service_types` for the acting tenant only. POST stamps tenant_id
 * from context (a forged body tenant_id cannot cross tenants) and computes the
 * next sort_order from the acting tenant's rows only — a foreign tenant's high
 * sort_order must not influence it.
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

import { GET, POST } from './route'

function seed() {
  return {
    service_types: [
      { id: 'svc-a1', tenant_id: A, name: 'Standard Clean', sort_order: 2 },
      { id: 'svc-b1', tenant_id: B, name: 'Foreign Deep Clean', sort_order: 99 },
    ],
    audit_log: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('settings/services — tenant isolation', () => {
  it("GET excludes a foreign tenant's service types", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.services as Array<{ id: string }>).map((s) => s.id)
    expect(ids).toEqual(['svc-a1'])
    expect(ids).not.toContain('svc-b1')
  })

  it('POST stamps acting tenant (ignores forged body tenant_id) and scopes sort_order', async () => {
    const req = new Request('http://t/api/settings/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Service', tenant_id: B }), // forged foreign tenant
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const inserted = h.capture.inserts.find((i) => i.table === 'service_types')
    expect(inserted).toBeTruthy()
    // stamp wins: row belongs to A, not the forged B
    expect(inserted!.rows[0].tenant_id).toBe(A)
    // next sort_order derives from A's max (2) → 3, NOT B's 99 → 100
    expect(inserted!.rows[0].sort_order).toBe(3)
  })
})
