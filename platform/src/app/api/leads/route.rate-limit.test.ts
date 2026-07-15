/**
 * leads/route.ts — missing rate limiting.
 *
 * Public, unauthenticated lead-capture form used by the onboarding page.
 * Writes to leads + partner_requests and sends an admin notification email
 * per submission — unlike its tenant-scoped sibling /api/lead (which
 * rate-limits by IP), this route had zero throttling: unbounded DB writes
 * plus an admin-inbox spam vector.
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
        const result = Promise.resolve({ error: null, data: null })
        return Object.assign(result, {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'lead-1' }, error: null }),
          }),
        })
      },
    }),
  },
}))

import type { NextRequest } from 'next/server'
import { POST } from './route'

function leadsReq(): NextRequest {
  const body = {
    name: 'Attacker',
    email: 'attacker@example.com',
    business_name: 'Acme',
  }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/leads — rate limiting', () => {
  it('is rate-limited per-ip and rejects (no email sent, no DB writes) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(leadsReq())
    expect(res.status).toBe(429)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('leads:203.0.113.9', 5, 10 * 60 * 1000)
  })

  it('allows the submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 4 })
    const res = await POST(leadsReq())
    expect(res.status).toBe(200)
    expect(insertCalls.map((c) => c.table)).toEqual(
      expect.arrayContaining(['leads', 'partner_requests']),
    )
  })
})
