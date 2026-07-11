import { describe, it, expect } from 'vitest'
import { buildPriceCopy } from './agent-config-loader'
import { buildPlaybook } from './build-playbook'
import type { ServiceType } from '@/lib/settings'
import type { AgentConfig } from './agent-config'

/**
 * F3 — the price-drop regression. The derived-config pipeline used to list only
 * service NAMES ("Services: Deep Clean, Standard") and never the dollar rates,
 * so a booking tenant's agent had no number to quote. buildPriceCopy now carries
 * each active service's real configured rate. (The exterminator is quote_only
 * and quotes nothing — this fix is for BOOKING/flat tenants that DO quote.)
 */

const svc = (name: string, rate: number, active = true): ServiceType => ({
  name,
  default_hours: 2,
  rate,
  active,
})

describe('buildPriceCopy — carries real service rates (F3 fix)', () => {
  it('includes the actual dollar rate per service for an hourly tenant', () => {
    const copy = buildPriceCopy([svc('Standard Clean', 45), svc('Deep Clean', 65)], 'hourly')
    expect(copy).toContain('Standard Clean — $45/hr')
    expect(copy).toContain('Deep Clean — $65/hr')
    expect(copy).toContain('Quote ONLY these configured rates')
  })

  it('uses flat pricing (no /hr) for a flat tenant', () => {
    const copy = buildPriceCopy([svc('Junk Removal', 250)], 'flat')
    expect(copy).toContain('Junk Removal — $250')
    expect(copy).not.toContain('/hr')
  })

  it('regression guard: the rate is NOT dropped — the copy contains a dollar figure', () => {
    const copy = buildPriceCopy([svc('Move-In Clean', 55)], 'hourly')
    expect(copy).toMatch(/\$55/)
  })

  it('falls back to the name only when a service has no configured rate', () => {
    const copy = buildPriceCopy([svc('Custom Job', 0)], 'hourly')
    expect(copy).toContain('Custom Job')
    expect(copy).not.toContain('$0')
  })

  it('quote_only tenants quote nothing (empty copy)', () => {
    expect(buildPriceCopy([svc('Anything', 99)], 'quote_only')).toBe('')
  })

  it('no configured services → generic guardrail, still no invented number', () => {
    const copy = buildPriceCopy([], 'hourly')
    expect(copy).toBe('Quote only your configured rates — never invent a number.')
  })

  it('the real rates survive into the assembled playbook a booking tenant sees', () => {
    const copy = buildPriceCopy([svc('Standard Clean', 45)], 'hourly')
    const cfg: AgentConfig = {
      identity: { agent_name: 'Ana', business_name: 'Acme Clean', run_statement: 'You run Acme Clean.' },
      voice: { persona: 'Warm.', examples: [], banned_phrases: [], endearments: [], openers: ['"Hi"'], emoji: false },
      service_area: 'NYC',
      policies: [],
      pricing: { model: 'hourly', copy },
      intake: { questions: ['What do you need?'] },
      payment: { methods: [], timing: 'as arranged' },
      contact: { phone: '212-000-0000', portal_url: 'acme.com/portal' },
      booking: { model: 'hourly' },
    }
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('$45/hr')
    expect(playbook).toContain('PRICING — DO NOT GUESS')
  })
})
