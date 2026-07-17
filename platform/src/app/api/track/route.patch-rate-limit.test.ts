import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/track's `_method: 'PATCH'` override path is protected by the
 * per-IP `track:${ip}` rate limit (checked before the body is parsed). But
 * the directly-exported `PATCH` handler called `handlePatch()` straight,
 * with no rate-limit check at all — an anonymous caller hitting PATCH
 * directly (no legit browser caller does; all real callers POST with the
 * `_method` override, per grep across every /api/track caller in the repo)
 * got unlimited DB updates against `lead_clicks`, unlike every other path
 * through this same public, unauthenticated route. Fixed by applying the
 * same `track:${ip}` rate limit to the exported PATCH handler.
 */

let rateLimitCalls: string[] = []
let rateLimitAllowed = true

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [{ id: 'visit-1' }] }),
              }),
            }),
          }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  },
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string) => {
    rateLimitCalls.push(bucketKey)
    return { allowed: rateLimitAllowed, remaining: rateLimitAllowed ? 100 : 0 }
  },
}))

import { PATCH } from './route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRequest = any

function patchReq(): AnyRequest {
  return new Request('https://example.com/api/track', {
    method: 'PATCH',
    headers: { 'x-forwarded-for': '198.51.100.20', 'content-type': 'application/json' },
    body: JSON.stringify({
      session_id: 'some-session',
      domain: 'victim-tenant.com',
      final_scroll: 100,
      final_time: 60,
      cta_clicked: true,
    }),
  })
}

beforeEach(() => {
  rateLimitCalls = []
  rateLimitAllowed = true
})

describe('PATCH /api/track — direct verb must honor the same per-IP rate limit as POST', () => {
  it('consults the track:${ip} rate limiter before writing', async () => {
    await PATCH(patchReq())
    expect(rateLimitCalls.some((k) => k === 'track:198.51.100.20')).toBe(true)
  })

  it('rejects with 429 once the limiter denies, without touching the DB update', async () => {
    rateLimitAllowed = false
    const res = await PATCH(patchReq())
    expect(res.status).toBe(429)
  })
})
