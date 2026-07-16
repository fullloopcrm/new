import { describe, it, expect } from 'vitest'
import { formatDigest, aggregateKeywords, splitByVolume, computeMovers, type DigestStats, type MetricRow } from './seo/digest'

const baseStats: DigestStats = {
  properties: 5,
  newIssues: {},
  proposed: 0,
  applied: 0,
  rejected: 0,
  rolledBack: 0,
  sitesDown: 0,
}

describe('formatDigest', () => {
  it('includes the label and property count', () => {
    const out = formatDigest(baseStats, 'nycmaid')
    expect(out).toContain('nycmaid')
    expect(out).toContain('Properties monitored: 5')
  })

  it('lists new issue types when present', () => {
    const out = formatDigest({ ...baseStats, newIssues: { striking_distance: 3, low_ctr: 1 } }, 'fleet-wide')
    expect(out).toContain('striking_distance: 3')
    expect(out).toContain('low_ctr: 1')
  })

  it('omits the issues section entirely when there are none', () => {
    const out = formatDigest(baseStats, 'fleet-wide')
    expect(out).not.toContain('New issues this week')
  })

  it('surfaces down sites as a warning line', () => {
    const out = formatDigest({ ...baseStats, sitesDown: 2 }, 'fleet-wide')
    expect(out).toContain('2 site(s) currently down')
  })

  it('omits the down-sites warning when nothing is down', () => {
    const out = formatDigest(baseStats, 'fleet-wide')
    expect(out).not.toContain('currently down')
  })
})

const metric = (query: string, impressions: number, position: number, clicks = 0): MetricRow => ({ query, impressions, position, clicks })

describe('aggregateKeywords', () => {
  it('sums clicks/impressions and impression-weights position across multiple rows for the same query', () => {
    const rows = [metric('cleaning nyc', 10, 5, 2), metric('cleaning nyc', 30, 15, 1)]
    const [row] = aggregateKeywords(rows)
    expect(row.impressions).toBe(40)
    expect(row.clicks).toBe(3)
    // weighted: (5*10 + 15*30) / 40 = 12.5
    expect(row.position).toBe(12.5)
  })

  it('sorts best position first', () => {
    const rows = [metric('b', 25, 20), metric('a', 25, 3)]
    const out = aggregateKeywords(rows)
    expect(out.map((r) => r.query)).toEqual(['a', 'b'])
  })
})

describe('splitByVolume', () => {
  it('separates queries below 25 impressions as needing work', () => {
    const keywords = aggregateKeywords([metric('real', 30, 5), metric('thin', 3, 40)])
    const { real, needsWork } = splitByVolume(keywords)
    expect(real.map((k) => k.query)).toEqual(['real'])
    expect(needsWork.map((k) => k.query)).toEqual(['thin'])
  })
})

describe('computeMovers', () => {
  it('flags an improved query as a winner with a negative delta', () => {
    const current = aggregateKeywords([metric('q1', 30, 5)])
    const previous = aggregateKeywords([metric('q1', 30, 15)])
    const { winners, losers } = computeMovers(current, previous)
    expect(winners).toHaveLength(1)
    expect(winners[0].delta).toBe(-10)
    expect(losers).toHaveLength(0)
  })

  it('flags a declined query as a loser with a positive delta', () => {
    const current = aggregateKeywords([metric('q1', 30, 15)])
    const previous = aggregateKeywords([metric('q1', 30, 5)])
    const { winners, losers } = computeMovers(current, previous)
    expect(losers).toHaveLength(1)
    expect(losers[0].delta).toBe(10)
    expect(winners).toHaveLength(0)
  })

  it('ignores a query with no previous-period data — nothing to compare against', () => {
    const current = aggregateKeywords([metric('brand-new-query', 30, 5)])
    const { winners, losers } = computeMovers(current, [])
    expect(winners).toHaveLength(0)
    expect(losers).toHaveLength(0)
  })

  it('excludes thin-volume queries from movers even if the position swung', () => {
    const current = aggregateKeywords([metric('thin', 3, 5)])
    const previous = aggregateKeywords([metric('thin', 3, 50)])
    const { winners, losers } = computeMovers(current, previous)
    expect(winners).toHaveLength(0)
    expect(losers).toHaveLength(0)
  })

  it('caps at topN and ranks by largest swing first', () => {
    const current = aggregateKeywords([metric('a', 30, 10), metric('b', 30, 10), metric('c', 30, 10)])
    const previous = aggregateKeywords([metric('a', 30, 15), metric('b', 30, 40), metric('c', 30, 12)])
    const { winners } = computeMovers(current, previous, 2)
    expect(winners).toHaveLength(2)
    expect(winners[0].query).toBe('b') // biggest improvement: 40 -> 10
  })
})
