import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * ingest/lead POST — rate-limit hardening. Sibling of
 * ingest/application/route.rate-limit.test.ts — same shared-secret-with-no-
 * per-caller-identity gap, same fix (see that file for full rationale).
 */

let rateLimitCalls: Array<{ key: string; max: number; windowMs: number; opts?: { failClosed?: boolean } }>
let rateLimitAllowed: boolean

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (
    key: string,
    max: number,
    windowMs: number,
    opts?: { failClosed?: boolean }
  ) => {
    rateLimitCalls.push({ key, max, windowMs, opts })
    return rateLimitAllowed
      ? { allowed: true, remaining: max - 1 }
      : { allowed: false, remaining: 0 }
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      throw new Error('should not reach the DB when rate-limited or unauthorized')
    },
  },
}))

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: async () => {
    throw new Error('should not resolve tenant when rate-limited or unauthorized')
  },
}))

vi.mock('@/lib/admin-contacts', () => ({
  emailAdmins: async () => {},
}))

vi.mock('@/lib/email-templates', () => ({
  adminNewClientEmail: () => ({ subject: '', html: '' }),
}))

vi.mock('@/lib/notify', () => ({
  notify: async () => {},
}))

vi.mock('@/lib/tenant-site', () => ({
  tenantSiteUrl: () => 'https://example.com',
}))

vi.mock('@/lib/error-tracking', () => ({
  trackError: async () => {},
}))

import { POST } from './route'

function req(opts: { secret?: string; ip?: string; body?: unknown }): Request {
  const headers = new Map<string, string>()
  if (opts.secret !== undefined) headers.set('x-ingest-secret', opts.secret)
  if (opts.ip !== undefined) headers.set('x-forwarded-for', opts.ip)
  return {
    headers: { get: (k: string) => headers.get(k) ?? null },
    json: async () => opts.body ?? {},
  } as unknown as Request
}

beforeEach(() => {
  rateLimitCalls = []
  rateLimitAllowed = true
  process.env.INGEST_SECRET = 'shared-secret'
})

describe('POST /api/ingest/lead — rate limit is fail-closed and checked before auth', () => {
  it('calls the persistent rate limiter with failClosed:true, keyed by IP', async () => {
    await POST(req({ secret: 'wrong', ip: '198.51.100.9' }))

    expect(rateLimitCalls).toHaveLength(1)
    expect(rateLimitCalls[0].key).toBe('ingest-lead:198.51.100.9')
    expect(rateLimitCalls[0].opts).toEqual({ failClosed: true })
  })

  it('429s before ever checking the secret when the limiter denies', async () => {
    rateLimitAllowed = false
    const res = await POST(req({ secret: 'shared-secret', ip: '198.51.100.9' }))
    expect(res.status).toBe(429)
  })

  it('still 401s a wrong secret when the limiter allows (auth unchanged)', async () => {
    const res = await POST(req({ secret: 'wrong', ip: '198.51.100.9' }))
    expect(res.status).toBe(401)
  })
})
