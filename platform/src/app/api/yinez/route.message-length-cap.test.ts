import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/yinez is fully unauthenticated and rate-limited on call *volume*
 * only (20/min per tenant+IP) — unlike admin/translate's MAX_TEXT_LENGTH (and
 * the sibling fix on ai/chat, ai/assistant, /api/chat), it never capped the
 * size of `message` before forwarding it to askSelena's paid Anthropic call.
 * A single oversized message still counts as one call against the volume
 * limit while driving arbitrarily large real Anthropic spend.
 */

const askSelena = vi.hoisted(() => vi.fn(async () => ({ text: 'hello from yinez', bookingCreated: false })))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
      }),
    }),
  },
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 20 }) }))
vi.mock('@/lib/selena/core', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena,
  isOwnerOfTenant: vi.fn(async () => false),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))

import { POST } from './route'

function post(message: string): NextRequest {
  return new NextRequest('https://app.fullloop.example/api/yinez', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message }),
  })
}

describe('POST /api/yinez — message length cap', () => {
  it('rejects an oversized message before calling askSelena', async () => {
    askSelena.mockClear()
    const res = await POST(post('x'.repeat(4001)))
    expect(res.status).toBe(400)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('allows a normal-sized message through to askSelena', async () => {
    askSelena.mockClear()
    const res = await POST(post('hi there'))
    expect(res.status).toBe(200)
    expect(askSelena).toHaveBeenCalledTimes(1)
  })
})
