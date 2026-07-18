import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * The rate limit on POST /api/chat bounds request COUNT (20/10min per
 * tenant+ip), not request SIZE -- a single call under that cap could still
 * stuff a multi-MB message into the Anthropic prompt, burning outsized
 * input-token spend per request. This caps message length before the LLM
 * (or any DB write) is ever reached.
 */

const A = 'tid-a'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (_id: string, sig: string | null | undefined) => sig === 'goodsig',
}))
const askSelenaLegacy = vi.fn(async () => ({ text: 'hello from selena', checklist: {}, bookingCreated: false }))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getNextStep: () => null,
  getQuickReplies: () => [],
  askSelena: (...args: unknown[]) => askSelenaLegacy(...(args as [])),
}))
vi.mock('@/lib/selena/agent', async () => {
  const actual = await vi.importActual<typeof import('@/lib/selena/agent')>('@/lib/selena/agent')
  return { askSelena: vi.fn(async () => ({ text: 'yinez', bookingCreated: false })), normalizePhoneDigits: actual.normalizePhoneDigits }
})
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
const insertConversationMessage = vi.fn()
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: (...args: unknown[]) => insertConversationMessage(...args) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ sms_conversations: [], sms_conversation_messages: [] })
  holder.from = h.from
  rateLimitDb.mockReset().mockResolvedValue({ allowed: true, remaining: 19 })
  askSelenaLegacy.mockClear()
  insertConversationMessage.mockReset().mockResolvedValue({ data: null, error: null })
})

function chat(message: string) {
  return POST(
    new NextRequest('http://t/api/chat', {
      method: 'POST',
      headers: { 'x-tenant-id': A, 'x-tenant-sig': 'goodsig', 'x-forwarded-for': '9.9.9.9' },
      body: JSON.stringify({ message }),
    }),
  )
}

describe('POST /api/chat — message length cap', () => {
  it('rejects a message over 5000 characters with 400, before the rate limiter or LLM run', async () => {
    const res = await chat('a'.repeat(5001))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/too long/i)
    expect(rateLimitDb).not.toHaveBeenCalled()
    expect(askSelenaLegacy).not.toHaveBeenCalled()
    expect(insertConversationMessage).not.toHaveBeenCalled()
  })

  it('accepts a message exactly at the 5000 character boundary', async () => {
    const res = await chat('a'.repeat(5000))
    expect(res.status).toBe(200)
    expect(askSelenaLegacy).toHaveBeenCalled()
  })

  it('accepts a normal short message', async () => {
    const res = await chat('hi there')
    expect(res.status).toBe(200)
  })
})
