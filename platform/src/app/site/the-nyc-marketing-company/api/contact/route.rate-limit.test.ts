/**
 * the-nyc-marketing-company/api/contact/route.ts — missing rate limiting +
 * unbounded attachment count/size.
 *
 * Public, unauthenticated contact form live at
 * https://thenycmarketingcompany.com/api/contact (middleware rewrites the
 * custom-domain root, including /api/*, to this site subtree — see
 * src/middleware.ts rewriteToSite). Sends a Resend email (with up to 10MB
 * file attachments) per submission with zero throttling and no cap on file
 * count/combined size — same spam/cost/resource-exhaustion class already
 * fixed on the sibling /api/leads and /api/feedback routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const sendMock = vi.hoisted(() => vi.fn(async () => ({ data: { id: 'email-1' }, error: null })))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from './route'

function jsonReq(ip = '203.0.113.9'): NextRequest {
  return {
    headers: new Headers({ 'x-forwarded-for': ip, 'content-type': 'application/json' }),
    json: async () => ({ type: 'strategy-quick', name: 'Attacker', email: 'attacker@example.com' }),
  } as unknown as NextRequest

}

function multipartReq(files: File[], ip = '203.0.113.9'): NextRequest {
  const fd = new FormData()
  fd.set('type', 'rfp')
  fd.set('data', JSON.stringify({ name: 'Attacker', email: 'attacker@example.com' }))
  for (const f of files) fd.append('files', f)
  return {
    headers: new Headers({ 'x-forwarded-for': ip, 'content-type': 'multipart/form-data; boundary=x' }),
    formData: async () => fd,
  } as unknown as NextRequest
}

beforeEach(() => {
  sendMock.mockClear()
  rateLimitDb.mockReset()
})

describe('POST /api/contact (the-nyc-marketing-company) — rate limiting', () => {
  it('is rate-limited per-ip and rejects (no email sent) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(jsonReq())
    expect(res.status).toBe(429)
    expect(sendMock).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith('nycmarketing-contact:203.0.113.9', 5, 10 * 60 * 1000)
  })

  it('allows a plain JSON submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    const res = await POST(jsonReq())
    expect(res.status).toBe(200)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/contact (the-nyc-marketing-company) — attachment caps', () => {
  it('rejects more than MAX_FILES attachments with no email sent', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    const files = Array.from({ length: 6 }, (_, i) => new File(['x'], `f${i}.pdf`, { type: 'application/pdf' }))
    const res = await POST(multipartReq(files))
    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('rejects when combined attachment size exceeds the 20MB cap', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    // 3 files x ~8MB each = ~24MB combined, each individually under the 10MB per-file cap
    const bigChunk = new Uint8Array(8 * 1024 * 1024)
    const files = [
      new File([bigChunk], 'a.pdf', { type: 'application/pdf' }),
      new File([bigChunk], 'b.pdf', { type: 'application/pdf' }),
      new File([bigChunk], 'c.pdf', { type: 'application/pdf' }),
    ]
    const res = await POST(multipartReq(files))
    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('allows a submission with attachments under both caps', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    const files = [new File(['x'], 'a.pdf', { type: 'application/pdf' })]
    const res = await POST(multipartReq(files))
    expect(res.status).toBe(200)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })
})
