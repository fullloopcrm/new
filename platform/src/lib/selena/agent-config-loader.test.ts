import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildPlaybook } from './build-playbook'
import { CHECKLIST_BY_INDUSTRY } from '@/lib/industry-presets'
import type { ServiceType } from '@/lib/settings'
import type { AgentConfig } from './agent-config'

/**
 * Combined coverage for the derived agent-config pipeline:
 *
 * F3 — the price-drop regression. The pipeline used to list only service NAMES
 * ("Services: Deep Clean, Standard") and never the dollar rates, so a booking
 * tenant's agent had no number to quote. buildPriceCopy now carries each active
 * service's real configured rate. (quote_only tenants quote nothing.)
 *
 * F2 — the active agent ignored the seeded per-trade checklist and always used a
 * generic 3-question intake. getAgentConfig now derives intake.questions from the
 * tenant's selena_config.checklist_fields, so a pest/roofing/HVAC tenant asks real
 * trade questions. Contact/schedule keys (rate/day/time/name/phone/email) are the
 * flow's job, not qualifying questions, so they're excluded.
 *
 * Supabase is mocked for the F2 suite: the tenant fetch resolves via .single();
 * the service_types fetch (used by getSettings) resolves via the terminal .order().
 */

let tenantRow: Record<string, unknown> | null
let serviceRows: unknown[]

function from(table: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => Promise.resolve({ data: serviceRows, error: null }),
    single: async () => ({ data: table === 'tenants' ? tenantRow : null, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from },
  supabase: { from },
}))

import { buildPriceCopy, getAgentConfig, intakeFromChecklist } from './agent-config-loader'
import { clearSettingsCache } from '@/lib/settings'

const svc = (name: string, rate: number, active = true): ServiceType => ({
  name,
  default_hours: 2,
  rate,
  active,
})

beforeEach(() => {
  clearSettingsCache()
  serviceRows = [{ name: 'General Pest Control', default_duration_hours: 1, default_hourly_rate: 95, active: true }]
  tenantRow = null
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

describe('getAgentConfig intake — seeded checklist reaches the agent (F2)', () => {
  it('uses the per-trade checklist questions, excluding contact/schedule keys', async () => {
    tenantRow = {
      id: 'p1', name: 'Ace Pest', industry: 'pest', agent_name: 'Yinez',
      selena_config: { checklist_fields: CHECKLIST_BY_INDUSTRY.pest },
    }
    const cfg = await getAgentConfig('p1')
    expect(cfg.intake.questions).toEqual([
      'Ask general, rodents, termites, or bed bugs.',
      'Ask pest type, severity, where they see them, and property type.',
      'Ask for address.',
    ])
    // The generic hardcoded intake must be gone.
    expect(cfg.intake.questions).not.toContain('Where are you located?')
    // Contact/schedule keys are NOT intake questions.
    expect(cfg.intake.questions).not.toContain('Ask for phone.')
    expect(cfg.intake.questions).not.toContain('Quote service rate.')
  })

  it('falls back to the generic intake when the tenant has no checklist', async () => {
    tenantRow = { id: 'e1', name: 'Empty Co', industry: 'general', agent_name: 'Jefe', selena_config: {} }
    const cfg = await getAgentConfig('e1')
    expect(cfg.intake.questions).toHaveLength(3)
    expect(cfg.intake.questions).toContain('Where are you located?')
    expect(cfg.intake.questions).toContain('When do you need it?')
  })
})

describe('intakeFromChecklist (F2)', () => {
  const fallback = ['fallback question']

  it('drops disabled fields and contact/schedule keys, keeps scope questions', () => {
    const checklist = [
      { key: 'service_type', enabled: true, question: 'What type?' },
      { key: 'notes', enabled: true, question: 'Describe the job.' },
      { key: 'address', enabled: true, question: 'Where?' },
      { key: 'rate', enabled: true, question: 'Quote it.' },
      { key: 'phone', enabled: true, question: 'Ask for phone.' },
      { key: 'bedrooms', enabled: false, question: 'How many bedrooms?' },
    ]
    expect(intakeFromChecklist(checklist, fallback)).toEqual(['What type?', 'Describe the job.', 'Where?'])
  })

  it('returns the fallback for a non-array or empty result', () => {
    expect(intakeFromChecklist(undefined, fallback)).toBe(fallback)
    expect(intakeFromChecklist([{ key: 'rate', enabled: true, question: 'Quote.' }], fallback)).toBe(fallback)
  })
})
