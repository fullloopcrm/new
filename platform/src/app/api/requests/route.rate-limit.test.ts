/**
 * requests/route.ts POST — fully anonymous, unauthenticated partner-signup
 * form (no tenant scoping) had NO rate limit at all — only a per-email 24h
 * dedup check that a caller trivially bypasses by using a fresh email on
 * every submission. Same unauthenticated cost-abuse class already fixed on
 * every sibling public form (contact, waitlist, apply, apply-ceo, prospects,
 * feedback) via the DB-backed rateLimitDb().
 */
import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const sendEmail = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/email', () => ({ sendEmail }))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const insertCalls: Array<{ table: string }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            limit: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
      insert: (_row: unknown) => {
        insertCalls.push({ table })
        return {
          select: () => ({
            single: async () => ({ data: { id: 'req-1' }, error: null }),
          }),
        }
      },
    }),
  },
}))

import { POST } from './route'

function validBody() {
  return {
    business_name: 'Acme Cleaning',
    contact_name: 'Jane Doe',
    email: 'jane@example.com',
    service_category: 'residential-cleaning',
    city: 'New York',
    state: 'NY',
    years_in_business: '5',
    team_size: '10',
    monthly_revenue: '50000',
    pitch: 'We would like to partner.',
  }
}

function requestsReq(): NextRequest {
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => validBody(),
  } as unknown as NextRequest
}

describe('POST /api/requests — rate limiting', () => {
  it('is rate-limited per-IP and rejects (no DB write) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(requestsReq())
    expect(res.status).toBe(429)
    expect(insertCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('partner-requests:203.0.113.9', 3, 10 * 60 * 1000)
  })

  it('allows the submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 2 })
    const res = await POST(requestsReq())
    expect(res.status).toBe(201)
    expect(insertCalls.map((c) => c.table)).toEqual(expect.arrayContaining(['partner_requests']))
  })
})
