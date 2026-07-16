/**
 * the-nyc-marketing-company/api/contact/route.ts — email format validation.
 *
 * `data.email` flows unmodified into Resend's `replyTo` field. Prior to this
 * fix the route only checked truthiness, so any non-empty string (including
 * one containing CRLF/control characters) was accepted and forwarded as a
 * mail header value. This is the only contact/lead route in the codebase
 * that uses user-submitted email as replyTo, so it gets its own boundary
 * check rather than relying on Resend's own validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn(async () => ({ allowed: true, remaining: 4 })))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const sendMock = vi.hoisted(() => vi.fn(async () => ({ data: { id: 'email-1' }, error: null })))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from './route'

function jsonReq(email: string): NextRequest {
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9', 'content-type': 'application/json' }),
    json: async () => ({ type: 'strategy-quick', name: 'Attacker', email }),
  } as unknown as NextRequest
}

beforeEach(() => {
  sendMock.mockClear()
  rateLimitDb.mockClear()
})

describe('POST /api/contact (the-nyc-marketing-company) — email format validation', () => {
  it('rejects an email containing a CRLF header-injection attempt', async () => {
    const res = await POST(jsonReq('victim@example.com\r\nBcc: attacker@evil.com'))
    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('rejects an email with no @ or domain', async () => {
    const res = await POST(jsonReq('not-an-email'))
    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('accepts a well-formed email and forwards it as replyTo', async () => {
    const res = await POST(jsonReq('lead@example.com'))
    expect(res.status).toBe(200)
    expect(sendMock).toHaveBeenCalledTimes(1)
    const calls = sendMock.mock.calls as unknown as Array<[{ replyTo?: string }]>
    expect(calls[0]?.[0]?.replyTo).toBe('lead@example.com')
  })
})
