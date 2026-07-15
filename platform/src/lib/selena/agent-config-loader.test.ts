import { describe, it, expect, beforeEach, vi } from 'vitest'
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

/**
 * Regression (F2): getAgentConfig() hardcoded a generic 3-question intake
 * (service list / location / timing) for EVERY non-nyc-maid tenant, so
 * provision-tenant.ts's per-industry CHECKLIST_BY_INDUSTRY checklist — already
 * seeded into tenants.selena_config.checklist_fields at signup — never reached
 * the agent for any trade (hvac, roofing, plumbing, ...). Only cleaning
 * tenants got a checklist-shaped intake, and only by accident (the generic
 * 3-question fallback happens to look plausible for cleaning too).
 *
 * This test proves a non-cleaning trade (hvac) gets ITS trade checklist —
 * not the generic fallback — and that a tenant with no selena_config still
 * falls back to the generic 3-question intake (no regression for legacy rows).
 * Exercises getAgentConfig() end-to-end (mocked DB), complementing the
 * deriveIntakeQuestions() unit tests above.
 */

type Eqs = Record<string, unknown>
let tenantRow: Record<string, unknown> | null

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => ({ data: table === 'tenants' ? tenantRow : null, error: null }),
    order: () => chain,
    then: (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [], error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    business_name: 'Acme HVAC',
    service_types: [],
    standard_rate: 0,
    payment_methods: ['zelle'],
    funnel_mode: 'booking' as const,
  }),
}))

import { getAgentConfig } from './agent-config-loader'

const HVAC_CHECKLIST = [
  { key: 'service_type', enabled: true, required: true, question: 'Ask tune-up, repair, install, or duct cleaning — system type.', sms_options: 'Tune-up,Repair,Install,Duct clean' },
  { key: 'notes', enabled: true, required: true, question: 'Ask for the job details — scope, condition, and anything specific they need.', sms_options: '' },
  { key: 'rate', enabled: true, required: true, question: 'Quote the rate.', sms_options: '' },
  { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
  { key: 'phone', enabled: false, required: false, question: 'Ask for phone (disabled for this tenant).', sms_options: '' },
]

beforeEach(() => {
  tenantRow = null
})

describe('getAgentConfig — per-trade intake checklist (F2)', () => {
  it('feeds a non-cleaning trade (hvac) its own checklist_fields instead of the generic 3-question intake', async () => {
    tenantRow = {
      name: 'Acme HVAC',
      phone: '555-1234',
      email: 'hi@acmehvac.com',
      domain: 'acmehvac.com',
      website_url: null,
      industry: 'hvac',
      agent_name: 'Jefe',
      address: null,
      selena_config: { checklist_fields: HVAC_CHECKLIST },
    }

    const cfg = await getAgentConfig('tenant-hvac')

    expect(cfg.intake.questions).toEqual([
      'Ask tune-up, repair, install, or duct cleaning — system type.',
      'Ask for the job details — scope, condition, and anything specific they need.',
      'Quote the rate.',
      'Ask for full name.',
    ])
    // disabled fields are excluded
    expect(cfg.intake.questions).not.toContain('Ask for phone (disabled for this tenant).')
    // and it must NOT be the old generic fallback
    expect(cfg.intake.questions).not.toContain('Where are you located?')
  })

  it('falls back to the generic 3-question intake when selena_config has no checklist_fields (legacy tenant)', async () => {
    tenantRow = {
      name: 'Acme HVAC',
      phone: '555-1234',
      email: 'hi@acmehvac.com',
      domain: 'acmehvac.com',
      website_url: null,
      industry: 'hvac',
      agent_name: 'Jefe',
      address: null,
      selena_config: {},
    }

    const cfg = await getAgentConfig('tenant-legacy')

    expect(cfg.intake.questions).toEqual(['What do you need help with?', 'Where are you located?', 'When do you need it?'])
  })
})
