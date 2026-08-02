import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/inquiry — rate-limit regression (2026-08-01).
 *
 * Live bug found while sweeping previously-uncovered routes: unlike its
 * siblings (prospects.ts: 3/hour, waitlist.ts, feedback.ts, all rate-limited),
 * this public contact-form route had NO rate limit at all. It sends a real
 * confirmation email to the caller-supplied `email` address with zero
 * ownership verification, so an attacker could spam arbitrary third-party
 * inboxes (email-bombing/harassment) as well as run up admin email/SMS costs
 * and unbounded row growth. Fixed to use the persistent rate_limit_events
 * limiter, matching feedback.ts's 5-per-10-min bar.
 */

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => store[table] || (store[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: () => c,
    insert: (row: Row) => {
      rowsOf().push(row)
      return Promise.resolve({ error: null })
    },
    then: (resolve: (v: { data: Row[]; error: null; count: number }) => unknown) =>
      resolve({ data: matched(), error: null, count: matched().length }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

import { POST } from './route'
import { sendEmail } from '@/lib/email'

const validBody = {
  name: 'Pat Example',
  email: 'pat@example.com',
  phone: '212-555-0100',
  message: 'Interested in learning more.',
}

function req(body: unknown, ip = '5.5.5.5'): NextRequest {
  return new NextRequest('http://x/api/inquiry', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  store.rate_limit_events = []
  store.inquiries = []
  store.partner_requests = []
  vi.mocked(sendEmail).mockClear()
})

describe('POST /api/inquiry — rate limit regression', () => {
  it('allows a normal submission through and sends the confirmation email', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalled()
  })

  it('rejects with 429 once the bucket already has 5 events, and never sends email or inserts', async () => {
    store.rate_limit_events = Array.from({ length: 5 }, (_, i) => ({
      id: `evt-${i}`,
      bucket_key: 'inquiry:5.5.5.5',
      happened_at: new Date().toISOString(),
    }))

    const res = await POST(req(validBody))

    expect(res.status).toBe(429)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(store.inquiries.length).toBe(0)
  })

  it('a different IP is not affected by another IP being rate-limited', async () => {
    store.rate_limit_events = Array.from({ length: 5 }, (_, i) => ({
      id: `evt-${i}`,
      bucket_key: 'inquiry:5.5.5.5',
      happened_at: new Date().toISOString(),
    }))

    const res = await POST(req(validBody, '9.9.9.9'))
    expect(res.status).toBe(200)
  })
})
