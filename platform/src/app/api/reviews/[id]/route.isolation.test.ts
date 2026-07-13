import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * reviews/[id] PUT — mass-assignment regression test.
 *
 * BUG (fixed here): the route spread the ENTIRE request body into
 * `reviews.update(body)` with no column allow-list — the caller controlled
 * every column on their own row, including `tenant_id` (row donation) and
 * `client_id`/`booking_id`/`team_member_id` (cross-tenant FK injection).
 *
 * FIX: only rating/comment/source/google_review_url/status/requested_at/
 * completed_at are now assignable; tenant_id and the FK columns are dropped
 * even if present in the body.
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

import { PUT } from './route'

function seed() {
  return {
    reviews: [
      { id: 'rv-a', tenant_id: CTX_TENANT, client_id: 'c-a', booking_id: 'bk-a', team_member_id: 'tm-a', rating: 5, status: 'pending' },
    ],
  }
}

function putReq(body: unknown): Request {
  return { url: 'http://t/api/reviews/rv-a', json: async () => body } as unknown as Request
}
function ctx() {
  return { params: Promise.resolve({ id: 'rv-a' }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('reviews/[id] PUT — mass-assignment guard', () => {
  it('drops tenant_id from the body — the row is never donated to another tenant', async () => {
    const res = await PUT(putReq({ status: 'posted', tenant_id: OTHER_TENANT }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'reviews')
    expect(upd!.values.tenant_id).toBeUndefined()
    const row = h.seed.reviews.find((r) => r.id === 'rv-a')!
    expect(row.tenant_id).toBe(CTX_TENANT)
  })

  it('drops client_id/booking_id/team_member_id FK columns from the body', async () => {
    const res = await PUT(putReq({ client_id: 'c-b', booking_id: 'bk-b', team_member_id: 'tm-b' }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'reviews')
    expect(upd!.values.client_id).toBeUndefined()
    expect(upd!.values.booking_id).toBeUndefined()
    expect(upd!.values.team_member_id).toBeUndefined()
  })

  it('allow-listed fields still update normally', async () => {
    const res = await PUT(putReq({ rating: 4, comment: 'great job' }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'reviews')
    expect(upd!.values.rating).toBe(4)
    expect(upd!.values.comment).toBe('great job')
  })
})
