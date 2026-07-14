import { describe, it, expect } from 'vitest'
import { buildPriceCopy, deriveIntakeQuestions } from './agent-config-loader'
import { buildPlaybook } from './build-playbook'
import { CHECKLIST_BY_INDUSTRY } from '@/lib/industry-presets'
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

/**
 * F2 — CHECKLIST_BY_INDUSTRY never reached the live agent for any tenant riding
 * the neutral base engine (every industry without a hand-authored config file —
 * ~34 of 53 verticals). getAgentConfig() hardcoded a generic 3-question intake
 * and silently ignored tenants.selena_config.checklist_fields, the per-trade
 * checklist provisionTenant() seeds and the owner can edit in dashboard/settings.
 * deriveIntakeQuestions() is the extracted fix: it now sources intake.questions
 * from the configured checklist, falling back to the generic questions only when
 * nothing has been configured.
 */
describe('deriveIntakeQuestions — per-trade checklist reaches the live agent (F2 fix)', () => {
  const fallback = ['What do you need?', 'Where are you located?', 'When do you need it?']

  it('a non-cleaning trade (dumpster) gets its real CHECKLIST_BY_INDUSTRY questions, not the generic fallback', () => {
    const questions = deriveIntakeQuestions(CHECKLIST_BY_INDUSTRY.dumpster, fallback)
    expect(questions[0]).toMatch(/dumpster size/i)
    expect(questions).not.toEqual(fallback)
  })

  it('every industry preset checklist survives the derivation with at least one question', () => {
    for (const [industry, fields] of Object.entries(CHECKLIST_BY_INDUSTRY)) {
      const questions = deriveIntakeQuestions(fields, fallback)
      expect(questions.length, `industry "${industry}" produced no intake questions`).toBeGreaterThan(0)
      expect(questions, `industry "${industry}" fell through to the generic fallback`).not.toEqual(fallback)
    }
  })

  it('disabled fields are excluded from the derived questions', () => {
    const questions = deriveIntakeQuestions(
      [
        { key: 'service_type', enabled: true, required: true, question: 'What service?', sms_options: '' },
        { key: 'notes', enabled: false, required: false, question: 'Should never appear.', sms_options: '' },
      ],
      fallback,
    )
    expect(questions).toEqual(['What service?'])
  })

  it('falls back to the generic questions when checklist_fields is unset (null/undefined)', () => {
    expect(deriveIntakeQuestions(undefined, fallback)).toEqual(fallback)
    expect(deriveIntakeQuestions(null, fallback)).toEqual(fallback)
  })

  it('falls back to the generic questions when checklist_fields is an empty array', () => {
    expect(deriveIntakeQuestions([], fallback)).toEqual(fallback)
  })

  it('falls back to the generic questions when every field is disabled', () => {
    const allDisabled = [
      { key: 'service_type', enabled: false, required: true, question: 'What service?', sms_options: '' },
    ]
    expect(deriveIntakeQuestions(allDisabled, fallback)).toEqual(fallback)
  })

  it('is defensive against malformed data (not an array)', () => {
    expect(deriveIntakeQuestions({ not: 'an array' }, fallback)).toEqual(fallback)
    expect(deriveIntakeQuestions('garbage', fallback)).toEqual(fallback)
  })

  it('the cleaning checklist (bedrooms/bathrooms) still derives correctly for a non-authored cleaning tenant', () => {
    const questions = deriveIntakeQuestions(CHECKLIST_BY_INDUSTRY.cleaning, fallback)
    expect(questions.some((q) => /bedrooms/i.test(q))).toBe(true)
  })
})
