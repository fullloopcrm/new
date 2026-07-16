/**
 * POST /api/chat is fully unauthenticated (public web-chat widget) and invokes
 * the Anthropic API per message with zero rate limit — a scripted caller could
 * loop it to run up real API spend and flood sms_conversation_messages. Capped
 * per tenant+IP via the existing DB-backed rateLimitDb, same pattern already
 * used on /api/track and /api/leads/visits.
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
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, _message: string, conversationId: string) =>
    ({ text: 'yinez reply', bookingCreated: false, conversationId })),
}))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getNextStep: () => ({ field: null, instruction: '' }),
  getQuickReplies: () => [],
  askSelena: vi.fn(async (_tenantId: string, _channel: string, _message: string, conversationId: string) =>
    ({ text: 'legacy reply', checklist: {}, bookingCreated: false, conversationId })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const SECRET = 'chat-rate-limit-test-secret'
const TENANT = 'tenant-1'
const IP = '203.0.113.9'
const fake = supabaseAdmin as unknown as FakeSupabase

function post() {
  const sig = signTenantHeader(TENANT)
  return new NextRequest('https://app.fullloop.example/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': TENANT,
      'x-tenant-sig': sig,
      'x-forwarded-for': IP,
    },
    body: JSON.stringify({ message: 'hi' }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  fake._store.clear()
  vi.clearAllMocks()
})

describe('POST /api/chat — rate limit', () => {
  it('allows a request under the per tenant+IP ceiling', async () => {
    const res = await POST(post())
    expect(res.status).toBe(200)
  })

  it('rejects with 429 once the per tenant+IP ceiling (20/min) is hit, WITHOUT invoking the LLM', async () => {
    const now = new Date().toISOString()
    fake._seed('rate_limit_events', Array.from({ length: 20 }, () => ({
      bucket_key: `chat:${TENANT}:${IP}`, happened_at: now,
    })))
    const { askSelena } = await import('@/lib/selena-legacy')

    const res = await POST(post())

    expect(res.status).toBe(429)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('does NOT rate-limit a different tenant sharing the same IP (bucket is per tenant+IP, not IP-only)', async () => {
    const now = new Date().toISOString()
    fake._seed('rate_limit_events', Array.from({ length: 20 }, () => ({
      bucket_key: `chat:${TENANT}:${IP}`, happened_at: now,
    })))

    const sig = signTenantHeader('tenant-other')
    const req = new NextRequest('https://app.fullloop.example/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'tenant-other',
        'x-tenant-sig': sig,
        'x-forwarded-for': IP,
      },
      body: JSON.stringify({ message: 'hi' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
  })
})
