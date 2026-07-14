/**
 * PUT /api/reviews/:id — mass-assignment / tenant-donation regression.
 *
 * The route used to spread the raw request body straight into `.update(body)`,
 * scoped only by `.eq('id', id).eq('tenant_id', tenantId)` on the WHERE side.
 * Nothing stopped the SET clause from including `tenant_id` (or the client_id/
 * booking_id/team_member_id FK columns) — any authenticated tenant caller
 * could reassign one of their own review rows into a different tenant's
 * namespace. Fixed by allow-listing the editable scalar fields via `pick()`.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    reviews: [
      { id: 'rev-A1', tenant_id: TENANT_A, rating: 5, comment: null, status: 'pending' },
      { id: 'rev-B1', tenant_id: TENANT_B, rating: 3, comment: null, status: 'pending' },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

describe('PUT /api/reviews/:id — mass-assignment guard', () => {
  it('updates an allow-listed field on the caller tenant’s own review', async () => {
    const res = await PUT(putReq({ comment: 'Thanks!' }), params('rev-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.review.comment).toBe('Thanks!')
  })

  it('drops a tenant_id in the body instead of donating the review to another tenant', async () => {
    const res = await PUT(putReq({ comment: 'hacked', tenant_id: TENANT_B }), params('rev-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.review.tenant_id).toBe(TENANT_A)
    expect(fake._all('reviews').find((r) => r.id === 'rev-A1')?.tenant_id).toBe(TENANT_A)
  })

  it('drops FK columns (client_id/booking_id/team_member_id) not in the allowlist', async () => {
    const res = await PUT(putReq({ comment: 'hi', client_id: 'someone-elses-client' }), params('rev-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.review.client_id).toBeUndefined()
  })

  it("tenant A can never update tenant B's review", async () => {
    const res = await PUT(putReq({ comment: 'hacked' }), params('rev-B1'))

    expect(res.status).toBe(500)
    expect(fake._all('reviews').find((r) => r.id === 'rev-B1')?.comment).toBeNull()
  })
})
