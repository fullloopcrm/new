import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * seo-health cron -- health.ts's runFleetHealth() (fleet-wide site-down
 * check) was defined and unit-tested but had zero real trigger anywhere in
 * the codebase. This route is the missing wire-up; cron/seo-alerts already
 * assumes this ran first (its own comment: "Runs after seo-health ... have
 * written any critical seo_issues rows").
 */

let healthResult: { checked: number; down: Array<{ domain: string }> }

vi.mock('@/lib/seo/health', () => ({
  runFleetHealth: vi.fn(async () => healthResult),
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/seo-health', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  healthResult = { checked: 0, down: [] }
})

describe('seo-health cron', () => {
  it('reports checked/down counts from runFleetHealth()', async () => {
    healthResult = { checked: 12, down: [{ domain: 'thenycseo.com' }] }

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, checked: 12, down: 1 })
  })

  it('rejects a request with no/bad CRON_SECRET auth', async () => {
    const res = await GET(new Request('http://t/api/cron/seo-health'))
    expect(res.status).toBe(401)
  })
})
