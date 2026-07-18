/**
 * VERIFY-REVERT — superseded-override guard.
 *
 * `seo_overrides` is keyed by `url` alone (one active row per URL, see
 * `2026_07_04_seo_overrides.sql`). `runVerifyRevert()` judges autopilot's own
 * past changes and, on a clear regression, calls `revertOverride(url)` —
 * unconditionally, keyed only by url. If a human/AI-approved change lands on
 * the SAME url after autopilot's change (a plausible collision: both
 * `remediate.ts` and autopilot's deterministic recipe can independently flag
 * the same weak-title page), the upsert in `applyOverride()` overwrites the
 * override row's `change_id` to point at the newer change. A later stale
 * verdict on autopilot's OLD change must not blow away that newer,
 * unrelated content just because it happens to share a url — this suite
 * proves the ownership check added to the revert branch closes that gap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { runVerifyRevert } from './verify-revert'

const fake = supabaseAdmin as unknown as FakeSupabase

const URL = 'https://example.com/nyc-maid-service'
const PROPERTY = 'sc-domain:example.com'
const AUTOPILOT_CHANGE_ID = 'change-autopilot-1'
const OTHER_CHANGE_ID = 'change-admin-2'

const OLD_APPLIED_AT = new Date(Date.now() - 40 * 86_400_000).toISOString() // past VERIFY_WEEKS

function seedAutopilotChange(overrides: Partial<Row> = {}) {
  fake._seed('seo_changes', [
    {
      id: AUTOPILOT_CHANGE_ID,
      property: PROPERTY,
      target_url: URL,
      applied_by: 'autopilot',
      status: 'applied',
      applied_at: OLD_APPLIED_AT,
      before_metric: { query: 'nyc maid service', position: 8 },
      ...overrides,
    },
  ])
}

// Regressed position (worse than baseline + REVERT_THRESHOLD) so the judge
// always lands in the revert branch.
function seedRegressedMetrics() {
  fake._seed('seo_metrics', [
    { property: PROPERTY, page: URL, query: 'nyc maid service', position: 15, impressions: 100, date: new Date().toISOString().slice(0, 10) },
  ])
}

beforeEach(() => {
  fake._store.clear()
})

describe('runVerifyRevert — superseded override', () => {
  it('reverts the live override when it is still autopilot’s own change', async () => {
    seedAutopilotChange()
    seedRegressedMetrics()
    fake._seed('seo_overrides', [
      { id: 'ov-1', url: URL, title: 'Autopilot title', active: true, source: 'signal', change_id: AUTOPILOT_CHANGE_ID },
    ])

    const result = await runVerifyRevert()

    expect(result.reverted).toBe(1)
    const override = fake._all('seo_overrides').find((r) => r.url === URL)
    expect(override?.active).toBe(false)
    const change = fake._all('seo_changes').find((r) => r.id === AUTOPILOT_CHANGE_ID)
    expect(change?.status).toBe('rolled_back')
    expect((change?.after_metric as Row)?.verdict).toBe('reverted')
  })

  it('does NOT clobber a newer override that superseded autopilot’s change on the same url', async () => {
    seedAutopilotChange()
    seedRegressedMetrics()
    // A human/AI-approved apply landed on the same url AFTER autopilot's
    // change — the override row's change_id now points at that newer
    // change, not the one being judged.
    fake._seed('seo_overrides', [
      { id: 'ov-1', url: URL, title: 'Newer admin-approved title', active: true, source: 'human', change_id: OTHER_CHANGE_ID },
    ])

    const result = await runVerifyRevert()

    expect(result.reverted).toBe(1) // autopilot's own change is still judged a loser...
    const override = fake._all('seo_overrides').find((r) => r.url === URL)
    // ...but the LIVE override (someone else's newer content) must survive untouched.
    expect(override?.active).toBe(true)
    expect(override?.title).toBe('Newer admin-approved title')
    const change = fake._all('seo_changes').find((r) => r.id === AUTOPILOT_CHANGE_ID)
    expect(change?.status).toBe('rolled_back')
    expect((change?.after_metric as Row)?.verdict).toBe('reverted_superseded')
  })

  it('reverts when no override row exists at all (never superseded, just gone)', async () => {
    seedAutopilotChange()
    seedRegressedMetrics()
    // No seo_overrides row seeded — overrideStillOwnedBy() must fail closed
    // (treat as not-owned) rather than throw.
    const result = await runVerifyRevert()

    expect(result.reverted).toBe(1)
    const change = fake._all('seo_changes').find((r) => r.id === AUTOPILOT_CHANGE_ID)
    expect((change?.after_metric as Row)?.verdict).toBe('reverted_superseded')
  })
})
