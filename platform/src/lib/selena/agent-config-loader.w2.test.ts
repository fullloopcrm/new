import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CHECKLIST_BY_INDUSTRY } from '@/lib/industry-presets'

/**
 * F2 — the active agent ignored the seeded per-trade checklist and always used a
 * generic 3-question intake. getAgentConfig now derives intake.questions from the
 * tenant's selena_config.checklist_fields, so a pest/roofing/HVAC tenant asks real
 * trade questions. Contact/schedule keys (rate/day/time/name/phone/email) are the
 * flow's job, not qualifying questions, so they're excluded.
 *
 * Supabase is mocked: the tenant fetch resolves via .single(); the service_types
 * fetch (used by getSettings) resolves via the terminal .order().
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

import { getAgentConfig, intakeFromChecklist } from './agent-config-loader'
import { clearSettingsCache } from '@/lib/settings'

beforeEach(() => {
  clearSettingsCache()
  serviceRows = [{ name: 'General Pest Control', default_duration_hours: 1, default_hourly_rate: 95, active: true }]
  tenantRow = null
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
