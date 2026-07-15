/**
 * feedback/route.ts POST — missing rate limiting.
 *
 * Fully anonymous, unauthenticated feedback form. Writes to
 * platform_feedback and sends an admin notification email per submission —
 * same abuse class as the sibling public forms (contact, inquiry, leads):
 * unbounded DB writes plus an admin-inbox spam vector, with zero throttling.
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const sendEmail = vi.hoisted(() => vi.fn(async () => ({ id: 'email-1' })))
vi.mock('@/lib/email', () => ({ sendEmail }))

const insertCalls: Array<{ table: string }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      insert: (_row: unknown) => {
        insertCalls.push({ table })
        return Promise.resolve({ error: null })
      },
    }),
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from './route'

function feedbackReq(): NextRequest {
  const body = { message: 'This is spam feedback content', category: 'general' }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/feedback — rate limiting', () => {
  it('is rate-limited per-ip and rejects (no email sent, no DB writes) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(feedbackReq())
    expect(res.status).toBe(429)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('feedback:203.0.113.9', 5, 10 * 60 * 1000)
  })

  it('allows the submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    const res = await POST(feedbackReq())
    expect(res.status).toBe(201)
    expect(insertCalls.map((c) => c.table)).toEqual(
      expect.arrayContaining(['platform_feedback']),
    )
  })
})
