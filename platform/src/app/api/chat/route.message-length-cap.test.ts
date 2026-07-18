import { describe, it, expect, beforeAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * POST /api/chat is fully unauthenticated and rate-limited on call *volume*
 * only (20/min per tenant+IP) — unlike admin/translate's MAX_TEXT_LENGTH (and
 * the sibling fix on ai/chat, ai/assistant, /api/yinez), it never capped the
 * size of `message` before forwarding it to askSelena/askYinez's paid
 * Anthropic call. A single oversized message still counts as one call
 * against the volume limit while driving arbitrarily large real Anthropic
 * spend.
 */

const SECRET = 'chat-route-message-length-cap-test-secret'
const TENANT = 'tenant-msg-cap'

const legacyAskSelena = vi.hoisted(() => vi.fn(async () => ({ text: 'ok', checklist: {}, bookingCreated: false })))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
      }),
    }),
  },
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 20 }) }))
vi.mock('@/lib/selena-legacy', () => ({
  askSelena: legacyAskSelena,
  EMPTY_CHECKLIST: {},
  getNextStep: () => null,
  getQuickReplies: () => [],
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'ok', bookingCreated: false })),
  isOwnerOfTenant: vi.fn(async () => false),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

function post(message: string): NextRequest {
  return new NextRequest('https://tenant-a.example.com/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': TENANT,
      'x-tenant-sig': signTenantHeader(TENANT),
    },
    body: JSON.stringify({ message }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

describe('POST /api/chat — message length cap', () => {
  it('rejects an oversized message before calling askSelena', async () => {
    legacyAskSelena.mockClear()
    const res = await POST(post('x'.repeat(4001)))
    expect(res.status).toBe(400)
    expect(legacyAskSelena).not.toHaveBeenCalled()
  })

  it('allows a normal-sized message through to askSelena', async () => {
    legacyAskSelena.mockClear()
    const res = await POST(post('hi there'))
    expect(res.status).toBe(200)
    expect(legacyAskSelena).toHaveBeenCalledTimes(1)
  })
})
