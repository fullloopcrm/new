import { describe, it, expect } from 'vitest'
import { formatDigest, type DigestStats } from './seo/digest'

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
