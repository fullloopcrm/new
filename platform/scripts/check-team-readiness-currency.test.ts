import { describe, it, expect } from 'vitest'
import { parseDocClaim, checkCurrency } from './check-team-readiness-currency.mjs'

const GOOD_LINE = '**Coverage (statements, src/lib + src/app/api, measured 2026-07-28): 55.5%** — 841 test files.'

describe('parseDocClaim', () => {
  it('parses the machine-readable coverage line', () => {
    const claim = parseDocClaim(`some text\n${GOOD_LINE}\nmore text`)
    expect(claim).toEqual({ measuredDate: '2026-07-28', statementsPct: 55.5, testFileCount: 841 })
  })

  it('returns null when the line is missing entirely', () => {
    expect(parseDocClaim('no coverage line here')).toBeNull()
  })

  it('returns null on a malformed line (wrong label)', () => {
    expect(parseDocClaim('**Coverage: 50%** — 10 test files.')).toBeNull()
  })
})

describe('checkCurrency', () => {
  const baseClaim = { measuredDate: '2026-07-28', statementsPct: 50, testFileCount: 100 }

  it('passes when everything matches exactly', () => {
    const result = checkCurrency({ claim: baseClaim, actualTestFileCount: 100, actualCoveragePct: 50, tolerancePts: 5 })
    expect(result.ok).toBe(true)
    expect(result.problems).toEqual([])
  })

  it('fails when the doc has no parseable claim at all', () => {
    const result = checkCurrency({ claim: null, actualTestFileCount: 100, actualCoveragePct: 50, tolerancePts: 5 })
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toMatch(/missing the machine-readable coverage line/)
  })

  it('fails on ANY test-file-count mismatch — no tolerance for that number', () => {
    const result = checkCurrency({ claim: baseClaim, actualTestFileCount: 841, actualCoveragePct: 50, tolerancePts: 5 })
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toMatch(/test file count is stale/)
  })

  it('passes when coverage drift is within tolerance', () => {
    const result = checkCurrency({ claim: baseClaim, actualTestFileCount: 100, actualCoveragePct: 54, tolerancePts: 5 })
    expect(result.ok).toBe(true)
  })

  it('fails when coverage drift exceeds tolerance', () => {
    const result = checkCurrency({ claim: baseClaim, actualTestFileCount: 100, actualCoveragePct: 56, tolerancePts: 5 })
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toMatch(/statement coverage is stale/)
  })

  it('skips the coverage-%% check (but still checks file count) when no coverage summary is available', () => {
    const result = checkCurrency({ claim: baseClaim, actualTestFileCount: 100, actualCoveragePct: null, tolerancePts: 5 })
    expect(result.ok).toBe(true)
  })

  it('reports both problems at once when both are stale', () => {
    const result = checkCurrency({ claim: baseClaim, actualTestFileCount: 999, actualCoveragePct: 90, tolerancePts: 5 })
    expect(result.problems).toHaveLength(2)
  })
})
