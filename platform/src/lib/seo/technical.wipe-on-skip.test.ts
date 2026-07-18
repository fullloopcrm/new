/**
 * runTechnicalScan() used to wipe ALL open 'not_indexed' issues up front, for
 * every property, before looping. Any property that then hit a skip path this
 * run -- no URLs to inspect, every URL Inspection call failing, or a thrown
 * error (sitemap fetch, quota, permission) -- kept its rows deleted and never
 * got them reinstated, because the insert only happens for properties that
 * actually produce fresh problems. That property's real not_indexed backlog
 * silently disappears until the next successful run reaches it, indistinguishable
 * from "confirmed clean." The same failure mode shows up in production when the
 * weekly cron's 300s budget runs out partway through the property list: every
 * property after the cutoff was wiped by the upfront delete and never refilled.
 */
import { describe, it, expect, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as FakeSupabase | null,
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('./index-cliff', () => ({
  captureAndEvaluate: vi.fn(async () => {}),
}))

vi.mock('./gsc', () => ({
  listSitemaps: vi.fn(async () => []),
  inspectUrl: vi.fn(async () => ({
    verdict: 'PASS',
    coverageState: 'Submitted and indexed',
  })),
}))

import { runTechnicalScan } from './technical'

describe('runTechnicalScan — property skipped this run', () => {
  it('leaves that property\'s existing not_indexed issues untouched instead of wiping them', async () => {
    h.fake = createFakeSupabase({
      seo_properties: [
        { property: 'sc-domain:healthy.com', domain: 'healthy.com', tenant_id: 't1', enabled: true },
        { property: 'sc-domain:skip.com', domain: 'skip.com', tenant_id: 't2', enabled: true },
      ],
      seo_metrics: [
        {
          property: 'sc-domain:healthy.com',
          page: 'https://healthy.com/',
          date: new Date().toISOString().slice(0, 10),
          impressions: 100,
          clicks: 5,
          ctr: 0.05,
          position: 8,
        },
        // skip.com has no seo_metrics rows and no sitemap -> selectUrls() has
        // nothing to inspect -> "no URLs to inspect" skip path.
      ],
      seo_issues: [
        {
          id: 'existing-healthy',
          property: 'sc-domain:healthy.com',
          type: 'not_indexed',
          status: 'open',
        },
        {
          id: 'existing-skip',
          property: 'sc-domain:skip.com',
          type: 'not_indexed',
          status: 'open',
        },
      ],
    })

    const result = await runTechnicalScan()

    // skip.com was never actually re-inspected this run -- its prior
    // not_indexed backlog must survive, not silently vanish.
    const skipIssues = h.fake._all('seo_issues').filter((r) => r.property === 'sc-domain:skip.com')
    expect(skipIssues).toHaveLength(1)
    expect(result.skipped.some((s) => s.includes('skip.com'))).toBe(true)

    // healthy.com WAS actually re-scanned and came back clean -- its stale
    // issue should be replaced (cleared), since we have fresh signal for it.
    const healthyIssues = h.fake._all('seo_issues').filter((r) => r.property === 'sc-domain:healthy.com')
    expect(healthyIssues).toHaveLength(0)
  })
})
