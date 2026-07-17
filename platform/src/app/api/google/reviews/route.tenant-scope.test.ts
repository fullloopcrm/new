import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/google/reviews (reply) verified the review belongs to the caller's
 * tenant before posting to Google, but the final local-save UPDATE only
 * filtered on `id` -- it dropped the tenant_id filter that every other write
 * in this route (and the rest of this session's sweep) applies. Not live-
 * exploitable today (the id was already ownership-checked earlier in the same
 * handler), but it's the same class of gap this session has closed everywhere
 * else, so it's fixed here too rather than left as the one write that isn't
 * defensively scoped.
 */

const TENANT_A = 'aaaaaaaa-1111-1111-1111-111111111111'
const TENANT_B = 'bbbbbbbb-2222-2222-2222-222222222222'
const REVIEW_ID = 'review-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<(r: Row) => boolean> = []
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
    const apply = () => rowsOf().filter((r) => filters.every((f) => f(r)))
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
      order: () => c,
      limit: () => c,
      single: async () => {
        const found = apply()[0]
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        const found = apply()[0]
        return { data: found ?? null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') {
          const matched = apply()
          DB[table] = rowsOf().map((r) => (matched.includes(r) ? { ...r, ...payload } : r))
          return Promise.resolve(res({ data: matched.map((r) => ({ ...r, ...payload })), error: null }))
        }
        return Promise.resolve(res({ data: apply(), error: null }))
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

const { tenantState } = vi.hoisted(() => ({ tenantState: { tenantId: '' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: tenantState.tenantId, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/google', () => ({
  getGoogleBusiness: async () => ({ location_name: 'accounts/1/locations/1', location_title: 'Test Biz' }),
}))

vi.mock('@/lib/google-reviews', () => ({
  generateReviewReply: async () => 'generated reply',
  postReviewReply: async () => true,
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

function jsonReq(body: Row): NextRequest {
  return new NextRequest('http://t.test/api/google/reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/google/reviews — tenant scoping on reply save', () => {
  beforeEach(() => {
    DB.google_reviews = [
      { id: REVIEW_ID, tenant_id: TENANT_A, reviewer_name: 'Al', rating: 5, comment: 'Great', google_review_id: 'g-1', reply: null },
    ]
  })

  it('saves the reply on the owning tenant\'s row', async () => {
    tenantState.tenantId = TENANT_A
    const res = await POST(jsonReq({ reviewId: REVIEW_ID, reply: 'Thanks!' }))
    expect(res.status).toBe(200)
    expect(DB.google_reviews[0].reply).toBe('Thanks!')
  })

  it('404s a reviewId belonging to another tenant, and never saves cross-tenant', async () => {
    tenantState.tenantId = TENANT_B
    const res = await POST(jsonReq({ reviewId: REVIEW_ID, reply: 'Hijacked' }))
    expect(res.status).toBe(404)
    expect(DB.google_reviews[0].reply).toBeNull()
  })
})
