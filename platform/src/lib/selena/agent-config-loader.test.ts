import { describe, it, expect, beforeEach, vi } from 'vitest'

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
