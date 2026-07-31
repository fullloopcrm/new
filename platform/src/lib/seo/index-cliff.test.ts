import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * seo-index-cliff (crm-03, 2026-07-31): vercel.json scheduled this cron
 * weekly since before the route existed -- confirmed live it 404'd every
 * run. Proves detectIndexCliffs() correctly compares a recent 7-day
 * impressions window against the prior 7-day baseline, per property, and
 * that runIndexCliffCheck() self-heals (clears + re-writes seo_issues so a
 * recovered property stops showing as an issue).
 */

let metricsRows: Array<{ property: string; date: string; impressions: number }>
let propertiesRows: Array<{ property: string; domain: string; tenant_id: string | null }>
const insertedIssues: Array<Record<string, unknown>> = []
const deletedTypes: string[] = []

type QueryState = {
  select?: string
  gte?: [string, string]
  lte?: [string, string]
  eqs: Record<string, unknown>
}

function builder(table: string) {
  const state: QueryState = { eqs: {} }
  const chain = {
    select: (cols: string) => { state.select = cols; return chain },
    // Test fixtures are always well under PAGE_SIZE (1000), so returning the
    // full filtered set on every page is equivalent to real pagination --
    // fetchImpressionsForProperty sees "rows.length < PAGE_SIZE" and stops
    // after one page either way.
    range: () => chain,
    order: () => chain,
    gte: (col: string, val: string) => { state.gte = [col, val]; return chain },
    lte: (col: string, val: string) => { state.lte = [col, val]; return chain },
    eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
    delete: () => ({
      eq: (col: string, val: unknown) => {
        if (table === 'seo_issues' && col === 'type') deletedTypes.push(String(val))
        return Promise.resolve({ data: null, error: null })
      },
    }),
    insert: (rows: Record<string, unknown>[]) => {
      if (table === 'seo_issues') insertedIssues.push(...rows)
      return Promise.resolve({ data: null, error: null })
    },
    then: (onFulfilled: (v: unknown) => void) => {
      if (table === 'seo_metrics' && state.select === 'impressions') {
        const rows = metricsRows.filter((r) => {
          if (state.eqs.property && r.property !== state.eqs.property) return false
          if (state.gte && r.date < state.gte[1]) return false
          if (state.lte && r.date > state.lte[1]) return false
          return true
        })
        return onFulfilled({ data: rows.map((r) => ({ impressions: r.impressions })), error: null })
      }
      if (table === 'seo_properties') {
        return onFulfilled({ data: propertiesRows, error: null })
      }
      return onFulfilled({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { detectIndexCliffs, runIndexCliffCheck } from './index-cliff'

// The implementation anchors its windows on (now - 2 days) -- see
// index-cliff.ts for why a live-queried MAX(date) was replaced with this
// fixed offset (it timed out against the real 560k-row table in prod).
// Test data must be generated relative to that same anchor, not fixed
// calendar dates, or it silently drifts out of window as real time passes.
const ANCHOR = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

/** daysAgoStart/End are inclusive offsets from ANCHOR, e.g. (13,7) = the baseline week, (6,0) = the recent week. */
function rowsForOffsetRange(property: string, daysAgoStart: number, daysAgoEnd: number, impressionsPerDay: number) {
  const rows: Array<{ property: string; date: string; impressions: number }> = []
  for (let daysAgo = daysAgoStart; daysAgo >= daysAgoEnd; daysAgo--) {
    const d = new Date(ANCHOR.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    rows.push({ property, date: d.toISOString().slice(0, 10), impressions: impressionsPerDay })
  }
  return rows
}

beforeEach(() => {
  insertedIssues.length = 0
  deletedTypes.length = 0
  propertiesRows = [
    { property: 'sc-domain:healthy.com', domain: 'healthy.com', tenant_id: 'tenant-A' },
    { property: 'sc-domain:cliffed.com', domain: 'cliffed.com', tenant_id: 'tenant-B' },
    { property: 'sc-domain:tiny.com', domain: 'tiny.com', tenant_id: 'tenant-C' },
  ]
  metricsRows = [
    // baseline (13..7 days ago, 100/day = 700), recent (6..0 days ago, 90/day = 630) -- 10% drop, not a cliff
    ...rowsForOffsetRange('sc-domain:healthy.com', 13, 7, 100),
    ...rowsForOffsetRange('sc-domain:healthy.com', 6, 0, 90),
    // baseline 700, recent 50 -- 92.8% drop, a real cliff (and critical-severity, >85%)
    ...rowsForOffsetRange('sc-domain:cliffed.com', 13, 7, 100),
    ...rowsForOffsetRange('sc-domain:cliffed.com', 6, 0, 50 / 7),
    // baseline well under the MIN_BASELINE_IMPRESSIONS floor -- must be ignored even though the % drop looks severe
    ...rowsForOffsetRange('sc-domain:tiny.com', 13, 7, 2),
    ...rowsForOffsetRange('sc-domain:tiny.com', 6, 0, 0),
  ]
})

describe('detectIndexCliffs (read-only, no writes)', () => {
  it('flags a property with a severe impressions drop, ignores normal week-to-week variance', async () => {
    const result = await detectIndexCliffs()
    const flaggedDomains = result.cliffs.map((c) => c.domain)
    expect(flaggedDomains).toContain('cliffed.com')
    expect(flaggedDomains).not.toContain('healthy.com')
  })

  it('ignores a property below the minimum baseline-impressions floor even if it dropped to zero', async () => {
    const result = await detectIndexCliffs()
    expect(result.cliffs.map((c) => c.domain)).not.toContain('tiny.com')
  })

  it('does not write anything -- pure diagnostic', async () => {
    await detectIndexCliffs()
    expect(insertedIssues.length).toBe(0)
    expect(deletedTypes.length).toBe(0)
  })
})

describe('runIndexCliffCheck (detect + persist, self-healing)', () => {
  it('clears prior index_cliff issues and writes a fresh critical row for the cliffed property', async () => {
    const result = await runIndexCliffCheck()

    expect(deletedTypes).toContain('index_cliff')
    expect(result.cliffs.length).toBe(1)

    const cliffedIssue = insertedIssues.find((i) => i.property === 'sc-domain:cliffed.com')
    expect(cliffedIssue).toBeDefined()
    expect(cliffedIssue?.type).toBe('index_cliff')
    expect(cliffedIssue?.severity).toBe('critical') // >85% drop
    expect(cliffedIssue?.tenant_id).toBe('tenant-B')
    expect(cliffedIssue?.status).toBe('open')
  })

  it('never inserts an issue for a healthy property', async () => {
    await runIndexCliffCheck()
    expect(insertedIssues.some((i) => i.property === 'sc-domain:healthy.com')).toBe(false)
  })

  it('when nothing is cliffed, still clears prior issues (self-healing) and inserts nothing', async () => {
    metricsRows = rowsForOffsetRange('sc-domain:healthy.com', 13, 0, 100)
    const result = await runIndexCliffCheck()
    expect(deletedTypes).toContain('index_cliff')
    expect(result.cliffs.length).toBe(0)
    expect(insertedIssues.length).toBe(0)
  })
})
