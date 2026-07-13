import { describe, it, expect } from 'vitest'
import { STEPS, summarize } from '../../scripts/preflight-check.mjs'

// Codifies the Section-Q pre-flight gate (15:07 LEADER->ALL item 5): a single
// command any worker/leader runs before reporting DONE. Pins the pass/fail
// logic independent of actually spawning tsc/vitest/audit-*.

describe('STEPS', () => {
  it('marks typecheck, unit tests, and the tenant-isolation gate as required', () => {
    const required = STEPS.filter((s) => s.required).map((s) => s.name)
    expect(required).toContain('typecheck (tsc --noEmit)')
    expect(required).toContain('unit tests (vitest)')
    expect(required).toContain('tenant-isolation gate')
  })

  it('marks the token-gated funnel-mode audit as non-required', () => {
    const funnelStep = STEPS.find((s) => s.name === 'funnel-mode audit')
    expect(funnelStep?.required).toBe(false)
  })
})

describe('summarize', () => {
  it('is not a hard failure when every required step passes', () => {
    const { hardFailure } = summarize([
      { name: 'typecheck', required: true, passed: true },
      { name: 'vitest', required: true, passed: true },
      { name: 'funnel-mode audit', required: false, passed: false },
    ])
    expect(hardFailure).toBe(false)
  })

  it('is a hard failure when any required step fails', () => {
    const { hardFailure } = summarize([
      { name: 'typecheck', required: true, passed: false },
      { name: 'vitest', required: true, passed: true },
    ])
    expect(hardFailure).toBe(true)
  })

  it('is not a hard failure when only a non-required step fails', () => {
    const { hardFailure } = summarize([
      { name: 'typecheck', required: true, passed: true },
      { name: 'funnel-mode audit', required: false, passed: false },
    ])
    expect(hardFailure).toBe(false)
  })

  it('labels non-required failures as SKIP/FAIL (non-blocking)', () => {
    const { lines } = summarize([{ name: 'funnel-mode audit', required: false, passed: false }])
    expect(lines[0]).toContain('SKIP/FAIL (non-blocking)')
    expect(lines[0]).toContain('funnel-mode audit')
  })

  it('labels required failures as FAIL', () => {
    const { lines } = summarize([{ name: 'typecheck', required: true, passed: false }])
    expect(lines[0]).toContain('[FAIL] typecheck')
  })

  it('labels passing steps as PASS', () => {
    const { lines } = summarize([{ name: 'typecheck', required: true, passed: true }])
    expect(lines[0]).toContain('[PASS] typecheck')
  })
})
