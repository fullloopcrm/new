import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Same class as chat/route.ts: the rate limit bounds request COUNT, not
 * SIZE -- a single call under that cap could still stuff a multi-MB message
 * into the Anthropic prompt. This caps message length before the LLM (or any
 * DB write) is ever reached.
 */

const A = 'tid-a'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (_id: string, sig: string | null | undefined) => sig === 'goodsig',
}))
const askSelena = vi.fn(async () => ({ text: 'hi from yinez', bookingCreated: false }))
vi.mock('@/lib/selena/agent', async () => {
  const actual = await vi.importActual<typeof import('@/lib/selena/agent')>('@/lib/selena/agent')
  return { askSelena: (...args: unknown[]) => askSelena(...(args as [])), normalizePhoneDigits: actual.normalizePhoneDigits }
})
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))
const insertConversationMessage = vi.fn()
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: (...args: unknown[]) => insertConversationMessage(...args) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ sms_conversations: [], clients: [] })
  holder.from = h.from
  rateLimitDb.mockReset().mockResolvedValue({ allowed: true, remaining: 19 })
  askSelena.mockClear()
  insertConversationMessage.mockReset().mockResolvedValue({ data: null, error: null })
})

function yinez(message: string) {
  return POST(
    new NextRequest('http://t/api/yinez', {
      method: 'POST',
      headers: { 'x-tenant-id': A, 'x-tenant-sig': 'goodsig', 'x-forwarded-for': '9.9.9.9' },
      body: JSON.stringify({ message }),
    }),
  )
}

describe('POST /api/yinez — message length cap', () => {
  it('rejects a message over 5000 characters with 400, before the rate limiter or LLM run', async () => {
    const res = await yinez('a'.repeat(5001))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/too long/i)
    expect(rateLimitDb).not.toHaveBeenCalled()
    expect(askSelena).not.toHaveBeenCalled()
    expect(insertConversationMessage).not.toHaveBeenCalled()
  })

  it('accepts a message exactly at the 5000 character boundary', async () => {
    const res = await yinez('a'.repeat(5000))
    expect(res.status).toBe(200)
    expect(askSelena).toHaveBeenCalled()
  })

  it('accepts a normal short message', async () => {
    const res = await yinez('hi there')
    expect(res.status).toBe(200)
  })
})
