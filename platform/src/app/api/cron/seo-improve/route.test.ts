import { describe, it, expect, beforeEach, afterEach } from 'vitest'

/**
 * Regression lock (2026-08-01): this route used a plain `!==` to compare the
 * Authorization header against CRON_SECRET -- the only one of 18 cron/seo-*
 * routes not using a timing-safe compare. Fixed to use safeEqual(), matching
 * every sibling route. The route itself is an inert stub (always 501 once
 * past auth -- see its own header comment), but CRON_SECRET is the same
 * shared secret gating every other cron route, several with real side
 * effects, so the comparison method still matters here.
 */

const ORIGINAL_SECRET = process.env.CRON_SECRET
const TEST_SECRET = 'test-cron-secret-value'

beforeEach(() => {
  process.env.CRON_SECRET = TEST_SECRET
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL_SECRET
})

import { GET } from './route'

function req(auth?: string): Request {
  return new Request('http://x/api/cron/seo-improve', {
    headers: auth ? { authorization: auth } : {},
  })
}

describe('GET /api/cron/seo-improve — auth gate', () => {
  it('rejects a missing Authorization header', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('rejects a wrong secret', async () => {
    const res = await GET(req('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('accepts the correct secret (and returns the documented 501 stub response)', async () => {
    const res = await GET(req(`Bearer ${TEST_SECRET}`))
    expect(res.status).toBe(501)
    const body = await res.json()
    expect(body.error).toMatch(/not implemented/)
  })
})
