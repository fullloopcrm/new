/**
 * runTechnicalScan() previously could not distinguish "scanned this property,
 * confirmed zero not_indexed pages" from "every URL Inspection call for this
 * property failed (GSC permission grant, quota, transient API error)". Both
 * ended up `inspected:0, problems:0`, and the property was still counted in
 * `out.scanned` with nothing in `out.skipped` -- a total inspection failure
 * silently read as a clean bill of health, indistinguishable in the cron's own
 * output from a genuinely healthy property. A newly-verified GSC property
 * whose service-account grant covers Search Analytics (ingest keeps working)
 * but not URL Inspection would then report permanently, silently clean while
 * real ingest data flows in for it -- the "fresh ingest, zero not_indexed
 * rows" shape.
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
  inspectUrl: vi.fn(async () => {
    throw new Error('URL inspect failed: 403 permission denied')
  }),
}))

import { runTechnicalScan } from './technical'

describe('runTechnicalScan — every URL Inspection call failing', () => {
  it('does not count the property as a clean scan, and surfaces the failure', async () => {
    const now = new Date().toISOString().slice(0, 10)
    h.fake = createFakeSupabase({
      seo_properties: [
        { property: 'sc-domain:test.com', domain: 'test.com', tenant_id: 't1', enabled: true },
      ],
      seo_metrics: [
        {
          property: 'sc-domain:test.com',
          page: 'https://test.com/',
          date: now,
          impressions: 100,
          clicks: 5,
          ctr: 0.05,
          position: 8,
        },
      ],
    })

    const result = await runTechnicalScan()

    // The old bug: inspected=0/problems=0 looked identical to a real clean
    // scan, so this property was silently counted here.
    expect(result.scanned).toBe(0)
    expect(result.notIndexed).toBe(0)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]).toContain('test.com')
    expect(result.skipped[0]).toContain('0 succeeded')
  })
})
