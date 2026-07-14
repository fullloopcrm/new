import { describe, it, expect } from 'vitest'
import { workerLabel } from './worker-label'

describe('workerLabel', () => {
  it('returns the neutral team-member label', () => {
    expect(workerLabel()).toEqual({ singular: 'Team member', plural: 'Team members' })
  })

  it('ignores the industry argument (never trade-specific)', () => {
    // Contract: the industry is accepted but deliberately ignored — cleaning must
    // NOT surface a "Cleaner" noun. Reverting to trade-specific labels fails here.
    expect(workerLabel('cleaning')).toEqual({ singular: 'Team member', plural: 'Team members' })
    expect(workerLabel('landscaping')).toEqual({ singular: 'Team member', plural: 'Team members' })
    expect(workerLabel(null)).toEqual({ singular: 'Team member', plural: 'Team members' })
  })
})
