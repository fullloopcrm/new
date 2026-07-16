/**
 * POST /api/yinez is fully unauthenticated (public web-chat widget) and
 * invokes the Anthropic API per message with zero rate limit — same
 * cost-abuse exposure as sibling /api/chat. Capped per tenant(+"unverified"
 * when the signed header is absent)+IP via the existing DB-backed
 * rateLimitDb, same pattern already used on /api/track and /api/leads/visits.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/selena/core', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, _message: string, conversationId: string) =>
    ({ text: 'hello from yinez', bookingCreated: false, conversationId })),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const SECRET = 'yinez-rate-limit-test-secret'
const TENANT = 'tenant-1'
const IP = '203.0.113.9'
const fake = supabaseAdmin as unknown as FakeSupabase

function post(headers: Record<string, string> = {}) {
  return new NextRequest('https://app.fullloop.example/api/yinez', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': IP, ...headers },
    body: JSON.stringify({ message: 'hi' }),
  })
}

function signedPost() {
  const sig = signTenantHeader(TENANT)
  return post({ 'x-tenant-id': TENANT, 'x-tenant-sig': sig })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  fake._store.clear()
  vi.clearAllMocks()
})

describe('POST /api/yinez — rate limit', () => {
  it('allows a request under the per tenant+IP ceiling', async () => {
    const res = await POST(signedPost())
    expect(res.status).toBe(200)
  })

  it('rejects with 429 once the per tenant+IP ceiling (20/min) is hit, WITHOUT invoking the LLM', async () => {
    const now = new Date().toISOString()
    fake._seed('rate_limit_events', Array.from({ length: 20 }, () => ({
      bucket_key: `yinez:${TENANT}:${IP}`, happened_at: now,
    })))
    const { askSelena } = await import('@/lib/selena/agent')

    const res = await POST(signedPost())

    expect(res.status).toBe(429)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('also caps a caller with NO signed tenant header, keyed under "unverified"+IP', async () => {
    const now = new Date().toISOString()
    fake._seed('rate_limit_events', Array.from({ length: 20 }, () => ({
      bucket_key: `yinez:unverified:${IP}`, happened_at: now,
    })))

    const res = await POST(post())

    expect(res.status).toBe(429)
  })

  it('does NOT rate-limit a different tenant sharing the same IP (bucket is per tenant+IP, not IP-only)', async () => {
    const now = new Date().toISOString()
    fake._seed('rate_limit_events', Array.from({ length: 20 }, () => ({
      bucket_key: `yinez:${TENANT}:${IP}`, happened_at: now,
    })))

    const sig = signTenantHeader('tenant-other')
    const res = await POST(post({ 'x-tenant-id': 'tenant-other', 'x-tenant-sig': sig }))

    expect(res.status).toBe(200)
  })
})
