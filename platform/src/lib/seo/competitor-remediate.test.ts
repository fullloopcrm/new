import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * competitor-remediate.ts tier assignment (fix/autopilot-position-tier,
 * 2026-08-01): same bug class as remediate.ts -- hardcoded tier: 1 on every
 * competitor_gap proposal regardless of our_position. competitors.ts creates
 * competitor_gap issues for any our_position <= 20 (STRIKING_MAX_POS),
 * including page-1 positions 1-10 where we're merely behind a rival while
 * still ranking well ourselves. Proves the proposal's tier now reflects
 * our_position: <=10 -> 2 (admin-approval only), >10 -> 1 (auto-eligible).
 */

let issuesRows: unknown[]
const insertedChanges: Record<string, unknown>[] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        not: () => chain,
        order: () => chain,
        limit: () => chain,
        delete: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }),
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
    },
  },
}))

vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: vi.fn(async () => ({
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text: '{"title":"New Title Here","meta":"New meta description here","rationale":"beats rival"}' }],
      })),
    },
  })),
}))

vi.mock('./remediate', () => ({
  fetchTitleMeta: vi.fn(async () => ({ title: 'Old Title', meta: 'Old meta' })),
}))

import { generateCompetitorProposals } from './competitor-remediate'

beforeEach(() => {
  insertedChanges.length = 0
})

describe('competitor-remediate.ts tier assignment', () => {
  it('tags a page-1 (our_position <= 10) gap as tier 2 — NOT auto-apply eligible', async () => {
    issuesRows = [{
      id: 'gap-page1', property: 'sc-domain:example.com', tenant_id: 't1',
      target_url: 'https://example.com/page',
      detail: { query: 'house cleaning', our_position: 7, top_competitor_domain: 'rival.com', top_competitor_title: 'Rival Cleaning' },
    }]
    await generateCompetitorProposals()
    expect(insertedChanges.length).toBeGreaterThan(0)
    expect(insertedChanges.every((c) => c.tier === 2)).toBe(true)
  })

  it('tags a page-2 (our_position > 10) gap as tier 1 — auto-apply eligible', async () => {
    issuesRows = [{
      id: 'gap-page2', property: 'sc-domain:example.com', tenant_id: 't1',
      target_url: 'https://example.com/page2',
      detail: { query: 'house cleaning', our_position: 15, top_competitor_domain: 'rival.com', top_competitor_title: 'Rival Cleaning' },
    }]
    await generateCompetitorProposals()
    expect(insertedChanges.length).toBeGreaterThan(0)
    expect(insertedChanges.every((c) => c.tier === 1)).toBe(true)
  })
})
