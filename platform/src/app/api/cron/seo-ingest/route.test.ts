import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * seo-ingest cron — backfillUntrackedDomains() wiring.
 *
 * backfillUntrackedDomains() (onboarding.ts) existed as pure dead code: no
 * cron, no admin trigger, only ever invoked from its own unit test. A tenant
 * live only via tenant_domains/tenants.domain and never GSC-discovered (e.g.
 * onboarded before registerSeoProperty's activate-tenant.ts hook existed, or
 * a pre-cutover legacy domain) stayed permanently untracked in seo_properties
 * -- invisible to the seomgr dashboard and Selena's handleSeoStatus() forever.
 * Wired here so the existing daily ingest cron sweeps any such gap.
 */

const ingestCalls: unknown[] = []
let backfillResult: Array<{ domain: string; property: string; created: boolean }>

vi.mock('@/lib/seo/ingest', () => ({
  ingestAllProperties: vi.fn(async (opts: unknown) => {
    ingestCalls.push(opts)
    return { properties: 0, totalRows: 0, results: [] }
  }),
}))

vi.mock('@/lib/seo/onboarding', () => ({
  backfillUntrackedDomains: vi.fn(async () => backfillResult),
}))

import { GET } from './route'

function req(query = '') {
  return new Request(`http://t/api/cron/seo-ingest${query}`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  ingestCalls.length = 0
  backfillResult = []
})

describe('seo-ingest cron', () => {
  it('runs backfillUntrackedDomains() before the GSC ingest pass and reports the count', async () => {
    backfillResult = [
      { domain: 'thenycseo.com', property: 'sc-domain:thenycseo.com', created: true },
      { domain: 'moodap.com', property: 'sc-domain:moodap.com', created: true },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.backfilled).toBe(2)
    expect(ingestCalls).toHaveLength(1)
  })

  it('reports zero backfilled when every domain is already tracked', async () => {
    backfillResult = []

    const res = await GET(req())
    const body = await res.json()

    expect(body.backfilled).toBe(0)
  })

  it('rejects an unauthenticated request without ever calling backfill or ingest', async () => {
    const res = await GET(new Request('http://t/api/cron/seo-ingest'))
    expect(res.status).toBe(401)
    expect(ingestCalls).toHaveLength(0)
  })
})
