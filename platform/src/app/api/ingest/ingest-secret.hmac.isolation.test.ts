import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'

/**
 * `/api/ingest/lead` and `/api/ingest/application` are the ONLY public sinks
 * that let a standalone marketing site write into another tenant's `clients` /
 * `portal_leads` / `deals`. They are cross-origin and unauthenticated except for
 * a shared `INGEST_SECRET` compared via constant-time `timingSafeEqual`. If that
 * gate ever failed open, any site on the internet could inject leads (and dedupe
 * against existing clients) into an arbitrary tenant by naming its slug.
 *
 * Both routes share the identical `secretMatches()` gate, so the isolation
 * property is asserted against BOTH — a regression that opened only one sibling
 * would otherwise slip through. Every case here returns at the auth gate (401)
 * or the JSON check (400) BEFORE any Supabase call, so no DB mock is needed and
 * the test stays hermetic.
 */

// Both routes now rate-limit by IP before the secret check (rateLimitDb,
// fail-closed). Mock it open so this suite stays hermetic and continues to
// exercise only the secret gate this file is about.
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 30 }),
}))

import { POST as postLead } from './lead/route'
import { POST as postApplication } from './application/route'

const SECRET = 'ingest-shared-secret'
const ORIG = process.env.INGEST_SECRET

const routes: Array<[string, (r: Request) => Promise<Response> | Response]> = [
  ['lead', postLead as unknown as (r: Request) => Promise<Response>],
  ['application', postApplication as unknown as (r: Request) => Promise<Response>],
]

function req(secret: string | null, body: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secret !== null) headers['x-ingest-secret'] = secret
  return new Request('https://x/api/ingest', { method: 'POST', headers, body })
}

beforeEach(() => {
  process.env.INGEST_SECRET = SECRET
})

afterAll(() => {
  if (ORIG === undefined) delete process.env.INGEST_SECRET
  else process.env.INGEST_SECRET = ORIG
})

describe.each(routes)('ingest /%s — shared-secret gate fail-closed', (name, post) => {
  it(`[${name}] 401s when INGEST_SECRET is not configured (fails closed, never open)`, async () => {
    delete process.env.INGEST_SECRET
    const res = await post(req(SECRET, JSON.stringify({ tenant_slug: 't', name: 'x', phone: '5551234567' })))
    expect(res.status).toBe(401)
  })

  it(`[${name}] 401s when the x-ingest-secret header is absent`, async () => {
    const res = await post(req(null, JSON.stringify({ tenant_slug: 't', name: 'x', phone: '5551234567' })))
    expect(res.status).toBe(401)
  })

  it(`[${name}] 401s on a wrong secret of the same length`, async () => {
    const wrong = 'X'.repeat(SECRET.length)
    expect(wrong).not.toBe(SECRET)
    const res = await post(req(wrong, JSON.stringify({ tenant_slug: 't', name: 'x', phone: '5551234567' })))
    expect(res.status).toBe(401)
  })

  it(`[${name}] 401s on a length-mismatched secret (guard precedes timingSafeEqual, no crash)`, async () => {
    // timingSafeEqual throws on unequal-length buffers; the length check must
    // reject first. A prefix of the real secret must NOT be accepted.
    const res = await post(req(SECRET.slice(0, 4), JSON.stringify({ tenant_slug: 't', name: 'x', phone: '5551234567' })))
    expect(res.status).toBe(401)
  })

  it(`[${name}] NON-VACUITY: the correct secret passes the gate (reaches body parsing, not 401)`, async () => {
    // Correct secret + deliberately malformed JSON => 400 'Invalid JSON',
    // proving the auth gate accepted and handed off (a always-401 gate would
    // never reach the JSON check).
    const res = await post(req(SECRET, '{not-json'))
    expect(res.status).toBe(400)
  })
})
