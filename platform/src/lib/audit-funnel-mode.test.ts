import { describe, it, expect } from 'vitest'
import { PROJECT_VERTICALS, effectiveFunnelMode, computeFindings } from '../../scripts/audit-funnel-mode.mjs'

// Codifies the F1 funnel-mode audit gate: provision-tenant.ts previously never
// set selena_config.funnel_mode, so every project/lead-vertical tenant
// (remodeling, roofing, restoration, ...) silently defaulted to the 'booking'
// funnel it should never run. This pins the classification logic that finds
// them, independent of any DB or network access.

describe('PROJECT_VERTICALS', () => {
  it('has exactly the 23 project (lead) verticals from IndustryKey', () => {
    expect(PROJECT_VERTICALS.size).toBe(23)
    expect(PROJECT_VERTICALS.has('restoration')).toBe(true)
    expect(PROJECT_VERTICALS.has('roofing')).toBe(true)
  })

  it('does not include service (booking) verticals', () => {
    expect(PROJECT_VERTICALS.has('cleaning')).toBe(false)
    expect(PROJECT_VERTICALS.has('towing')).toBe(false)
    expect(PROJECT_VERTICALS.has('plumbing')).toBe(false)
    expect(PROJECT_VERTICALS.has('general')).toBe(false)
  })
})

describe('effectiveFunnelMode', () => {
  it('mirrors lib/settings.ts: unset funnel_mode resolves to booking', () => {
    expect(effectiveFunnelMode(null)).toBe('booking')
    expect(effectiveFunnelMode({})).toBe('booking')
    expect(effectiveFunnelMode({ funnel_mode: 'garbage' })).toBe('booking')
  })

  it('passes through pipeline and lead_only', () => {
    expect(effectiveFunnelMode({ funnel_mode: 'pipeline' })).toBe('pipeline')
    expect(effectiveFunnelMode({ funnel_mode: 'lead_only' })).toBe('lead_only')
  })
})

describe('computeFindings', () => {
  it('flags a project-vertical tenant with no funnel_mode set (the F1 bug)', () => {
    const tenants = [
      { id: '1', name: 'Acme Remodeling', industry: 'remodeling', selena_config: {} },
    ]
    const findings = computeFindings(tenants)
    expect(findings).toEqual([
      { id: '1', name: 'Acme Remodeling', industry: 'remodeling', funnel_mode: 'booking' },
    ])
  })

  it('does not flag a project-vertical tenant already on pipeline', () => {
    const tenants = [
      { id: '2', name: 'Fixed Roofing Co', industry: 'roofing', selena_config: { funnel_mode: 'pipeline' } },
    ]
    expect(computeFindings(tenants)).toEqual([])
  })

  it('does not flag a service-vertical tenant defaulting to booking (correct)', () => {
    const tenants = [
      { id: '3', name: 'Sparkle Cleaning', industry: 'cleaning', selena_config: {} },
    ]
    expect(computeFindings(tenants)).toEqual([])
  })

  it('does not flag a tenant with no selena_config at all', () => {
    const tenants = [
      { id: '4', name: 'No Config Restoration', industry: 'restoration', selena_config: null },
    ]
    expect(computeFindings(tenants)).toEqual([
      { id: '4', name: 'No Config Restoration', industry: 'restoration', funnel_mode: 'booking' },
    ])
  })
})
