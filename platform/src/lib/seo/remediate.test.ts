import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * remediate.ts tier assignment (fix/autopilot-position-tier, 2026-08-01):
 * generateProposals() used to hardcode tier: 1 on every seo_changes row it
 * wrote, regardless of the source issue's type. seo_issues itself sets
 * tier=1 for BOTH low_ctr (page-1, position 6-10) and striking_distance
 * (page-2, position 11-20) issues -- a detection-priority tier, not an
 * auto-apply-eligibility tier. Because autopilot.ts auto-applies everything
 * with seo_changes.tier=1, the hardcoded value meant page-1 rankings were
 * exactly as auto-eligible as page-2 ones -- the opposite of the intended
 * policy (page 1 = suggestion + admin approval only, page 2+ = auto-apply).
 *
 * Proves proposeForIssue() now derives seo_changes.tier from the issue's own
 * `type`: striking_distance -> 1 (auto-eligible), low_ctr -> 2 (falls to the
 * existing admin-approval queue in /admin/seo, same as everything else
 * autopilot skips).
 */

type IssueRow = {
  id: string; property: string; tenant_id: string | null; target_url: string | null
  recipe: string | null; tier: number | null; type: string; detail: Record<string, unknown>
}

let issuesRows: IssueRow[]
const insertedChanges: Record<string, unknown>[] = []

function builder(table: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: { query: 'house cleaning near me' }, error: null }),
    delete: () => chain,
    insert: (rows: Record<string, unknown>[]) => {
      if (table === 'seo_changes') insertedChanges.push(...rows)
      return Promise.resolve({ data: null, error: null })
    },
    then: (onFulfilled: (v: unknown) => void) => {
      if (table === 'seo_issues') return onFulfilled({ data: issuesRows, error: null })
      return onFulfilled({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: vi.fn(async () => ({
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text: '{"title":"New Title Here","meta":"New meta description here","rationale":"test"}' }],
      })),
    },
  })),
}))

vi.mock('../ssrf', () => ({
  safeFetch: vi.fn(async () => new Response('<title>Old Title</title><meta name="description" content="Old meta">')),
}))

import { generateProposals } from './remediate'

beforeEach(() => {
  insertedChanges.length = 0
})

describe('remediate.ts tier assignment', () => {
  it('tags a striking_distance (page-2) issue tier 1 — auto-apply eligible', async () => {
    issuesRows = [{
      id: 'issue-page2', property: 'sc-domain:example.com', tenant_id: 't1',
      target_url: 'https://example.com/page', recipe: 'onpage_push', tier: 1,
      type: 'striking_distance', detail: {},
    }]
    await generateProposals()
    expect(insertedChanges.length).toBeGreaterThan(0)
    expect(insertedChanges.every((c) => c.tier === 1)).toBe(true)
  })

  it('tags a low_ctr (page-1) issue tier 2 — NOT auto-apply eligible', async () => {
    issuesRows = [{
      id: 'issue-page1', property: 'sc-domain:example.com', tenant_id: 't1',
      target_url: 'https://example.com/page', recipe: 'title_meta', tier: 1,
      type: 'low_ctr', detail: {},
    }]
    await generateProposals()
    expect(insertedChanges.length).toBeGreaterThan(0)
    expect(insertedChanges.every((c) => c.tier === 2)).toBe(true)
  })
})
