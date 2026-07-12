import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/google/reviews (converted to tenantDb).
 *
 * GET lists reviews via tenantDb (`.eq('tenant_id', ctx)`) — a foreign tenant's
 * reviews are filtered out. POST replies to a review fetched through tenantDb, so
 * a review owned by another tenant 404s and is never replied to. Probes both.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenant: { id: A } })),
  AuthError: class AuthError extends Error { status = 401 },
}))
const spies = vi.hoisted(() => ({
  generateReviewReply: vi.fn(async () => 'AI-generated reply'),
  postReviewReply: vi.fn(async () => true),
}))
vi.mock('@/lib/google-reviews', () => ({
  generateReviewReply: spies.generateReviewReply,
  postReviewReply: spies.postReviewReply,
}))
vi.mock('@/lib/google', () => ({ getGoogleBusiness: vi.fn(async () => null) }))

import { GET, POST } from './route'

function seed() {
  return {
    google_reviews: [
      { id: 'rv-a', tenant_id: A, reviewer_name: 'A', rating: 5, comment: 'great', google_review_id: 'g-a' },
      { id: 'rv-b', tenant_id: B, reviewer_name: 'B', rating: 1, comment: 'SECRET B', google_review_id: 'g-b' },
    ],
    tenant_settings: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('google/reviews — tenant isolation', () => {
  it("GET: lists only the caller's own reviews, not another tenant's", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reviews.map((r: { id: string }) => r.id)).toEqual(['rv-a'])
  })

  it("POST positive: replying to the caller's own review is found (AI draft returned)", async () => {
    const res = await POST(new NextRequest('http://t/x', { method: 'POST', body: JSON.stringify({ reviewId: 'rv-a', generateAI: true }) }))
    expect(res.status).toBe(200)
    expect((await res.json()).generatedReply).toBe('AI-generated reply')
  })

  it("POST wrong-tenant probe: a foreign review 404s and is never replied to", async () => {
    const res = await POST(new NextRequest('http://t/x', { method: 'POST', body: JSON.stringify({ reviewId: 'rv-b', reply: 'hi' }) }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Review not found')
    expect(spies.postReviewReply).not.toHaveBeenCalled()
  })
})
