/**
 * inquiry/route.ts — missing rate limiting.
 *
 * Fully anonymous, unauthenticated marketing-site contact form that sends a
 * real "confirmation" email to the caller-supplied `email` address from the
 * platform's own trusted sending domain, plus DB writes (inquiries +
 * partner_requests) — unlike every sibling public lead-capture route
 * (contact, portal/collect), it had zero throttling, making it an open
 * mail-relay/spam-bombing vector against arbitrary target addresses.
 */
import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

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

import { POST } from './route'

function inquiryReq(): NextRequest {
  const body = {
    name: 'Attacker',
    email: 'victim@example.com',
    phone: '5551234567',
    message: 'hi',
  }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/inquiry — rate limiting', () => {
  it('is rate-limited per-ip and rejects (no email sent, no DB writes) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(inquiryReq())
    expect(res.status).toBe(429)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('inquiry:203.0.113.9', 3, 10 * 60 * 1000)
  })

  it('allows the submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 2 })
    const res = await POST(inquiryReq())
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'victim@example.com' }),
    )
    expect(insertCalls.map((c) => c.table)).toEqual(
      expect.arrayContaining(['inquiries', 'partner_requests']),
    )
  })
})
