import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/deals (converted to tenantDb).
 *
 *  GET  → must list ONLY the caller tenant's deals (wrong-tenant probe).
 *  POST → tenantDb stamps tenant_id last, so a body that forges another tenant's
 *         id must NOT win: the persisted row carries the caller's tenant.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { GET, POST, DELETE } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-a', tenant_id: CTX_TENANT, status: 'active', title: 'Mine', follow_up_at: null },
      { id: 'deal-b', tenant_id: OTHER_TENANT, status: 'active', title: 'Theirs', follow_up_at: null },
    ],
    deal_activities: [],
    clients: [
      { id: 'client-a', tenant_id: CTX_TENANT, name: 'Mine Client' },
      { id: 'client-b', tenant_id: OTHER_TENANT, name: 'Theirs Client' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('deals — tenant isolation', () => {
  it('GET wrong-tenant probe: only the caller tenant\'s deals are returned', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.deals.map((d: { id: string }) => d.id)
    expect(ids).toContain('deal-a')
    expect(ids).not.toContain('deal-b')
    expect(body.deals.every((d: { tenant_id: string }) => d.tenant_id === CTX_TENANT)).toBe(true)
  })

  it('POST cannot forge tenant_id: a foreign tenant_id in the body is overwritten by the ctx tenant', async () => {
    const req = {
      json: async () => ({ title: 'x', tenant_id: OTHER_TENANT }),
    } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(200)

    const dealInsert = h.capture.inserts.find((i) => i.table === 'deals')
    expect(dealInsert).toBeDefined()
    // The forged tenant must have lost to the tenantDb stamp.
    expect(dealInsert!.rows.every((r) => r.tenant_id === CTX_TENANT)).toBe(true)
    expect(dealInsert!.rows.some((r) => r.tenant_id === OTHER_TENANT)).toBe(false)
  })

  // Regression: client_id is a caller-supplied FK with no cross-tenant check
  // at the DB layer, and every read of this route joins clients(...) by that
  // id unscoped by tenant — a foreign client_id would leak another tenant's
  // client name/email/phone/address into this tenant's pipeline.
  it("WRONG-TENANT PROBE: POST with a foreign tenant's client_id is rejected, not inserted", async () => {
    const req = { json: async () => ({ client_id: 'client-b' }) } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(404)

    const dealInsert = h.capture.inserts.find((i) => i.table === 'deals')
    expect(dealInsert).toBeUndefined()
  })

  it('POST with the acting tenant\'s own client_id succeeds', async () => {
    const req = { json: async () => ({ client_id: 'client-a', title: 'x' }) } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(200)

    const dealInsert = h.capture.inserts.find((i) => i.table === 'deals')
    expect(dealInsert!.rows[0].client_id).toBe('client-a')
  })
})

// Regression: DELETE used to report `{ success: true }` unconditionally even
// when the tenant filter silently matched zero rows for a foreign id — same
// response-honesty bug class as the admin/ai-chat update/cancel_bookings fix.
// Fixed by chaining `.select('id')` on the delete and checking the match count.
describe('deals DELETE — tenant isolation', () => {
  const del = (id: string) =>
    DELETE({ json: async () => ({ id }) } as unknown as Request)

  it('wrong-tenant probe: deleting a foreign tenant deal reports 404, not success:true', async () => {
    const res = await del('deal-b')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).not.toBe(true)
    expect(h.seed.deals.some((d) => d.id === 'deal-b')).toBe(true)
  })

  it("deleting the acting tenant's own deal reports success:true and actually removes it", async () => {
    const res = await del('deal-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(h.seed.deals.some((d) => d.id === 'deal-a')).toBe(false)
  })
})
