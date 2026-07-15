/**
 * waitlist/route.ts POST — rate limiting was in-memory only.
 *
 * Fully anonymous, unauthenticated lead-capture form (tenant resolved from a
 * signed host header, not a session). The prior guard was a plain in-process
 * Map, which does not survive serverless cold starts and is not shared across
 * concurrent instances — same class already fixed on the sibling public forms
 * (contact, feedback, lead, public-upload) via the DB-backed rateLimitDb().
 */
import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', phone: '555-0100' })),
}))

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify }))

const smsAdmins = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins }))

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

function waitlistReq(): NextRequest {
  const body = { name: 'Jane Doe', phone: '5551234567' }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/waitlist — rate limiting', () => {
  it('is rate-limited per tenant+ip and rejects (no DB write) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(waitlistReq())
    expect(res.status).toBe(429)
    expect(insertCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('waitlist:tenant-1:203.0.113.9', 5, 10 * 60 * 1000)
  })

  it('allows the submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    const res = await POST(waitlistReq())
    expect(res.status).toBe(200)
    expect(insertCalls.map((c) => c.table)).toEqual(expect.arrayContaining(['waitlist']))
  })
})
