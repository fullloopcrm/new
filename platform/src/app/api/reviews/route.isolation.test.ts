import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/reviews.
 *
 *  GET  → must list ONLY the caller tenant's reviews (wrong-tenant probe).
 *  POST → client_id is a caller-supplied FK with no cross-tenant check at the
 *         DB layer, and GET's clients(name) join is unscoped by tenant — a
 *         foreign client_id would leak another tenant's client name into
 *         this tenant's review list. Same bug class as the deals fix
 *         (93286e34). Verify ownership before insert.
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

import { GET, POST } from './route'

const CLIENT_A = '11111111-1111-1111-1111-111111111111'
const CLIENT_B = '22222222-2222-2222-2222-222222222222'

function seed() {
  return {
    reviews: [
      { id: 'review-a', tenant_id: CTX_TENANT, client_id: CLIENT_A, rating: 5, comment: 'Mine' },
      { id: 'review-b', tenant_id: OTHER_TENANT, client_id: CLIENT_B, rating: 4, comment: 'Theirs' },
    ],
    clients: [
      { id: CLIENT_A, tenant_id: CTX_TENANT, name: 'Mine Client' },
      { id: CLIENT_B, tenant_id: OTHER_TENANT, name: 'Theirs Client' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('reviews — tenant isolation', () => {
  it("GET wrong-tenant probe: only the caller tenant's reviews are returned", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.reviews.map((r: { id: string }) => r.id)
    expect(ids).toContain('review-a')
    expect(ids).not.toContain('review-b')
  })

  it("WRONG-TENANT PROBE: POST with a foreign tenant's client_id is rejected, not inserted", async () => {
    const req = {
      json: async () => ({ client_id: CLIENT_B, rating: 5 }),
    } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(404)

    const reviewInsert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(reviewInsert).toBeUndefined()
  })

  it("POST with the acting tenant's own client_id succeeds", async () => {
    const req = {
      json: async () => ({ client_id: CLIENT_A, rating: 5, comment: 'great' }),
    } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(201)

    const reviewInsert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(reviewInsert!.rows[0].client_id).toBe(CLIENT_A)
    expect(reviewInsert!.rows[0].tenant_id).toBe(CTX_TENANT)
  })

  it('POST without a client_id still succeeds (client_id is optional)', async () => {
    const req = {
      json: async () => ({ rating: 3, source: 'google' }),
    } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(201)

    const reviewInsert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(reviewInsert!.rows[0].client_id).toBeNull()
  })
})
