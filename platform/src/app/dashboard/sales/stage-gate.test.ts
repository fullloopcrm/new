import { describe, it, expect } from 'vitest'
import { nextStageOptions } from './stage-gate'

/**
 * The per-deal stage dropdown used to list every pipeline stage regardless of
 * where the deal currently sits, so a Lead could be moved straight to Quote
 * (proposal) with no Qualify step in between. nextStageOptions() is what now
 * bounds the dropdown to only the next valid stage (+ Lost / reopen).
 */
describe('nextStageOptions', () => {
  it('a Lead can only move to Qualifying or Lost — never straight to Quote', () => {
    const options = nextStageOptions('new')
    expect(options).toEqual(['qualifying', 'lost'])
    expect(options).not.toContain('quoted')
    expect(options).not.toContain('sold')
  })

  it('a Qualifying deal can only move to Quoted or Lost', () => {
    expect(nextStageOptions('qualifying')).toEqual(['quoted', 'lost'])
  })

  it('a Quoted deal can only move to Pending or Lost — not straight to Sold', () => {
    expect(nextStageOptions('quoted')).toEqual(['pending', 'lost'])
  })

  it('a Pending deal can only move to Sold or Lost', () => {
    expect(nextStageOptions('pending')).toEqual(['sold', 'lost'])
  })

  it('a Sold deal is terminal — no further moves offered', () => {
    expect(nextStageOptions('sold')).toEqual([])
  })

  it('a Lost deal can only be reopened to Lead', () => {
    expect(nextStageOptions('lost')).toEqual(['new'])
  })
})
