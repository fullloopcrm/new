import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/admin/selena/score with { ai_review: true } triggers a real
 * paid Anthropic call (selfReviewConversation) but had NO rate limit and is
 * gated on settings.view — a permission manager holds by default, not just
 * admin/owner. A scripted caller with manager-tier access could loop this
 * endpoint to run up unbounded Anthropic spend against the tenant's stored
 * key. Same fix convention as admin/translate: rateLimitDb(30/10min) before
 * the AI call, only on the ai_review path (the rule-based scorer is free).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    }),
  },
}))

let selfReviewCallCount = 0
vi.mock('@/lib/conversation-scorer', () => ({
  scoreConversation: async () => ({ score: 80, issues: [] }),
  selfReviewConversation: async () => {
    selfReviewCallCount++
    return { review: 'ok', score: 90, improvements: [] }
  },
  scoreRecentConversations: async () => ({ scored: 0, avgScore: 0 }),
}))

let rateLimitAllowed = true
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed, remaining: rateLimitAllowed ? 29 : 0 }),
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

function req(body: unknown): NextRequest {
  return new NextRequest('https://x/api/admin/selena/score', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/admin/selena/score — ai_review rate limit', () => {
  it('429s when the rate limiter denies, without calling Anthropic', async () => {
    rateLimitAllowed = false
    selfReviewCallCount = 0
    const res = await POST(req({ conversation_id: 'convo-1', ai_review: true }))
    expect(res.status).toBe(429)
    expect(selfReviewCallCount).toBe(0)
  })

  it('allows the AI review through when under the limit', async () => {
    rateLimitAllowed = true
    selfReviewCallCount = 0
    const res = await POST(req({ conversation_id: 'convo-1', ai_review: true }))
    expect(res.status).toBe(200)
    expect(selfReviewCallCount).toBe(1)
  })

  it('never rate-limits the free rule-based-only path (no ai_review)', async () => {
    rateLimitAllowed = false
    selfReviewCallCount = 0
    const res = await POST(req({ conversation_id: 'convo-1' }))
    expect(res.status).toBe(200)
    expect(selfReviewCallCount).toBe(0)
  })
})
