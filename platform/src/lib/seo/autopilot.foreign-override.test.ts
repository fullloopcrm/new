/**
 * AUTOPILOT — foreign-override guard.
 *
 * `seo_overrides` is keyed by `url` alone. `runAutopilot()`'s candidates are
 * always `status:'proposed'` (never-yet-applied) rows on the deterministic
 * recipe, selected with no regard to whether that same url already carries
 * an ACTIVE override from a totally different, human-reviewed proposal
 * (`remediate.ts` / `competitor-remediate.ts`, applied via
 * `/api/admin/seo/apply`). Before the fix, autopilot would happily overwrite
 * that reviewed, live content with its own unreviewed automated title/meta —
 * silently undoing a human's approved edit. This suite proves the guard
 * added to `runAutopilot()` skips those urls instead of overwriting them.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { runAutopilot } from './autopilot'

const fake = supabaseAdmin as unknown as FakeSupabase

const URL = 'https://example.com/nyc-maid-service'
const PROPERTY = 'sc-domain:example.com'

function seedProposedTitleChange(overrides: Partial<Row> = {}) {
  fake._seed('seo_changes', [
    {
      id: 'change-1',
      property: PROPERTY,
      tenant_id: null,
      target_url: URL,
      field: 'title',
      before_value: 'Old weak title',
      after_value: 'A New York City Maid Service You Can Trust',
      status: 'proposed',
      tier: 1,
      recipe: 'title_meta_deterministic',
      proposed_at: new Date().toISOString(),
      ...overrides,
    },
  ])
}

beforeEach(() => {
  fake._store.clear()
  process.env.SEO_AUTOPILOT_ENABLED = 'true'
})

describe('runAutopilot — foreign override guard', () => {
  it('applies normally when no override yet exists for the url', async () => {
    seedProposedTitleChange()

    const result = await runAutopilot()

    expect(result.applied).toBe(1)
    expect(result.skippedForeignOverride).toBe(0)
    const override = fake._all('seo_overrides').find((r) => r.url === URL)
    expect(override?.title).toBe('A New York City Maid Service You Can Trust')
  })

  it('does NOT overwrite a live override that a human already approved for the same url', async () => {
    seedProposedTitleChange()
    // A human approved a completely different title for this same url via
    // /api/admin/seo/apply (a different, unrelated AI-drafted proposal —
    // change_id intentionally does not reference change-1).
    fake._seed('seo_overrides', [
      { id: 'ov-1', url: URL, title: 'Human-approved title', active: true, source: 'signal', change_id: 'change-human-2' },
    ])

    const result = await runAutopilot()

    expect(result.applied).toBe(0)
    expect(result.skippedForeignOverride).toBe(1)
    const override = fake._all('seo_overrides').find((r) => r.url === URL)
    expect(override?.title).toBe('Human-approved title')
    // The autopilot proposal itself is left alone (still 'proposed') so a
    // human can see and explicitly dismiss it, rather than autopilot
    // silently deciding the outcome.
    const change = fake._all('seo_changes').find((r) => r.id === 'change-1')
    expect(change?.status).toBe('proposed')
  })

  it('still applies when the existing override is inactive (already reverted)', async () => {
    seedProposedTitleChange()
    fake._seed('seo_overrides', [
      { id: 'ov-1', url: URL, title: 'Old reverted title', active: false, source: 'signal', change_id: 'change-old-3' },
    ])

    const result = await runAutopilot()

    expect(result.applied).toBe(1)
    expect(result.skippedForeignOverride).toBe(0)
  })
})
