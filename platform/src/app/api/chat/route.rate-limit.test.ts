import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/chat is public and unauthenticated (tenant scoped only by the
 * middleware-signed header, not a login) and every message triggers a real,
 * billed Anthropic API call (askSelena/askYinez) -- against the TENANT's own
 * key when set. Unlike the platform-level marketing forms already
 * rate-limited this session, a scripted flood here burns real per-tenant LLM
 * spend with no volume gate at all. Fixed with the same rateLimitDb
 * (`chat:${tenantId}:${ip}`) bucket convention, tuned to 20/10min so a real
 * multi-turn conversation isn't throttled.
 */

const A = 'tid-a'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (_id: string, sig: string | null | undefined) => sig === 'goodsig',
}))
const askSelena = vi.fn(async () => ({ text: 'hello from selena', checklist: {}, bookingCreated: false }))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getNextStep: () => null,
  getQuickReplies: () => [],
  askSelena: (...args: unknown[]) => askSelena(...(args as [])),
}))
vi.mock('@/lib/selena/agent', async () => {
  const actual = await vi.importActual<typeof import('@/lib/selena/agent')>('@/lib/selena/agent')
  return { askSelena: vi.fn(async () => ({ text: 'yinez', bookingCreated: false })), normalizePhoneDigits: actual.normalizePhoneDigits }
})
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ sms_conversations: [], sms_conversation_messages: [] })
  holder.from = h.from
  rateLimitDb.mockReset()
  askSelena.mockClear()
})

function chat(ip = '9.9.9.9') {
  return POST(
    new NextRequest('http://t/api/chat', {
      method: 'POST',
      headers: { 'x-tenant-id': A, 'x-tenant-sig': 'goodsig', 'x-forwarded-for': ip },
      body: JSON.stringify({ message: 'hi' }),
    }),
  )
}

describe('POST /api/chat — rate limiting', () => {
  it('rejects with 429 once the per-tenant-IP bucket is exhausted, before calling the LLM', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const res = await chat()
    expect(res.status).toBe(429)
    expect(askSelena).not.toHaveBeenCalled()
    expect(h.capture.inserts.find((i) => i.table === 'sms_conversations')).toBeUndefined()
    expect(rateLimitDb).toHaveBeenCalledWith(`chat:${A}:9.9.9.9`, 20, 10 * 60 * 1000)
  })

  it('passes through to the LLM when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 19 })
    const res = await chat()
    expect(res.status).toBe(200)
    expect(askSelena).toHaveBeenCalled()
  })
})
