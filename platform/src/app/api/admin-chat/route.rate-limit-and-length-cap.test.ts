import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/admin-chat drives a real Anthropic call (askSelena) on every
 * message and is gated on settings.view — held by manager, not just
 * admin/owner — with no message-length cap and no rate limit. Same
 * AI-cost-abuse class already fixed on admin/translate, ai/chat,
 * ai/assistant, /api/chat, /api/yinez, and admin/selena/score.
 */

const TENANT = 'tenant-rate-limit-cap'
const CONVO = 'convo-own-1'

let askSelenaCallCount = 0

vi.mock('@/lib/supabase', () => {
  function chain() {
    const c: Record<string, unknown> = {
      select: () => c,
      insert: () => ({ then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) }),
      eq: () => c,
      is: () => c,
      order: () => c,
      limit: () => c,
      maybeSingle: async () => ({ data: { id: CONVO, tenant_id: TENANT, phone: '+12122029220' }, error: null }),
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => resolve({ data: null, error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: () => chain() } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: async () => {
    askSelenaCallCount++
    return { text: 'reply', toolsCalled: [] }
  },
}))

let rateLimitAllowed = true
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed, remaining: rateLimitAllowed ? 29 : 0 }),
}))

import { POST } from './route'

function post(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://t.test/api/admin-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  askSelenaCallCount = 0
  rateLimitAllowed = true
})

describe('POST /api/admin-chat — message length cap', () => {
  it('rejects an oversized message before calling Selena/Anthropic', async () => {
    const res = await POST(post({ message: 'x'.repeat(4001), sessionId: CONVO }))
    expect(res.status).toBe(400)
    expect(askSelenaCallCount).toBe(0)
  })

  it('allows a normal-sized message through', async () => {
    const res = await POST(post({ message: 'hi there', sessionId: CONVO }))
    expect(res.status).toBe(200)
    expect(askSelenaCallCount).toBe(1)
  })
})

describe('POST /api/admin-chat — rate limit', () => {
  it('429s when the rate limiter denies, without calling Selena/Anthropic', async () => {
    rateLimitAllowed = false
    const res = await POST(post({ message: 'hi there', sessionId: CONVO }))
    expect(res.status).toBe(429)
    expect(askSelenaCallCount).toBe(0)
  })
})
