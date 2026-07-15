import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * F2 RUNTIME integration test — distinct from agent-config-loader.test.ts,
 * which unit-tests getAgentConfig() in isolation and asserts on the returned
 * intake.questions ARRAY. This test proves the trade checklist survives the
 * rest of the actual composition chain askSelenaCore() runs in agent.ts for
 * every non-nyc-maid tenant:
 *
 *   getAgentConfig(tenantId) + getPersona(tenantId)
 *     -> applyPersonaToConfig(cfg, persona) -> buildPlaybook(...)
 *     -> the literal prompt TEXT sent to the LLM
 *
 * Two things a loader-only test can't see:
 *   1. applyPersonaToConfig can OVERRIDE intake.questions from
 *      persona.qualifying_questions (persona-file.ts:84) — and reads the
 *      SAME selena_config JSONB blob getAgentConfig reads checklist_fields
 *      from. A future key collision or refactor there could silently drop
 *      the trade checklist before it reaches the prompt.
 *   2. buildPlaybook only renders cfg.intake.questions inside specific
 *      funnel-mode branches (quote_first / appointment+hourly / lead
 *      capture) — a loader test can't catch a branch that stops rendering it.
 *
 * This asserts on the FINAL RENDERED PLAYBOOK STRING, not the intermediate
 * AgentConfig object.
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
    service_types: [{ name: 'Repair', active: true }],
    standard_rate: 125,
    payment_methods: ['zelle'],
    funnel_mode: 'booking' as const,
  }),
}))

import { getAgentConfig } from './agent-config-loader'
import { getPersona, applyPersonaToConfig, renderPersonaExtras } from './persona-file'
import { buildPlaybook } from './build-playbook'

const HVAC_CHECKLIST = [
  { key: 'service_type', enabled: true, required: true, question: 'Ask tune-up, repair, install, or duct cleaning — system type.', sms_options: 'Tune-up,Repair,Install,Duct clean' },
  { key: 'notes', enabled: true, required: true, question: 'Ask for the job details — scope, condition, and anything specific they need.', sms_options: '' },
  { key: 'rate', enabled: true, required: true, question: 'Quote the rate.', sms_options: '' },
  { key: 'phone', enabled: false, required: false, question: 'Ask for phone (disabled for this tenant).', sms_options: '' },
]

// Mirrors agent.ts's askSelenaCore() non-nyc-maid composition exactly, minus
// the constant SHARED_PREAMBLE string — that carries no tenant/checklist
// content, and importing it would mean pulling in the whole agent.ts module
// (Anthropic client, tool registry, conversation loading) for nothing this
// proof needs.
async function runtimePrompt(tenantId: string): Promise<string> {
  const [cfg, persona] = await Promise.all([getAgentConfig(tenantId), getPersona(tenantId)])
  return buildPlaybook(applyPersonaToConfig(cfg, persona)) + renderPersonaExtras(persona)
}

beforeEach(() => {
  tenantRow = null
})

describe('F2 runtime integration — non-cleaning trade checklist survives loader -> persona fold -> playbook render', () => {
  it("an hvac tenant's RENDERED playbook text contains its OWN checklist questions, not the generic fallback", async () => {
    tenantRow = {
      name: 'Acme HVAC', phone: '555-1234', email: 'hi@acmehvac.com', domain: 'acmehvac.com',
      website_url: null, industry: 'hvac', agent_name: 'Jefe', address: null,
      selena_config: { checklist_fields: HVAC_CHECKLIST },
    }

    const prompt = await runtimePrompt('tenant-hvac')

    expect(prompt).toContain('Ask tune-up, repair, install, or duct cleaning — system type.')
    expect(prompt).toContain('Ask for the job details — scope, condition, and anything specific they need.')
    // 'rate' is in NON_INTAKE_CHECKLIST_KEYS (agent-config-loader.ts) — quoted
    // from the dedicated PRICING section, not rendered as a literal checklist
    // question (so the agent never improvises a number instead of quoting
    // configured rates).
    expect(prompt).not.toContain('Quote the rate.')
    expect(prompt).toContain('PRICING')
    // disabled field must not leak into the live prompt
    expect(prompt).not.toContain('Ask for phone (disabled for this tenant).')
    // generic 3-question fallback must NOT appear alongside the real checklist
    expect(prompt).not.toContain('Where are you located?')
  })

  it('survives applyPersonaToConfig even when the SAME selena_config blob also carries other authored persona fields (no qualifying_questions collision)', async () => {
    tenantRow = {
      name: 'Acme HVAC', phone: '555-1234', email: 'hi@acmehvac.com', domain: 'acmehvac.com',
      website_url: null, industry: 'hvac', agent_name: 'Jefe', address: null,
      selena_config: {
        checklist_fields: HVAC_CHECKLIST,
        opening_lines: ['Hey, this is Jefe from Acme HVAC!'],
        banned_phrases: ['no worries'],
      },
    }

    const prompt = await runtimePrompt('tenant-hvac-persona')

    // the trade checklist still made it through the persona fold...
    expect(prompt).toContain('Ask tune-up, repair, install, or duct cleaning — system type.')
    // ...and the persona fold DID actually run (proves this isn't a no-op test)
    expect(prompt).toContain('Hey, this is Jefe from Acme HVAC!')
  })

  it('a persona that DOES author qualifying_questions legitimately overrides the trade checklist in the rendered prompt (documents the real precedence, not a bug)', async () => {
    tenantRow = {
      name: 'Acme HVAC', phone: '555-1234', email: 'hi@acmehvac.com', domain: 'acmehvac.com',
      website_url: null, industry: 'hvac', agent_name: 'Jefe', address: null,
      selena_config: {
        checklist_fields: HVAC_CHECKLIST,
        qualifying_questions: ['Owner-authored: what type of unit do you have?'],
      },
    }

    const prompt = await runtimePrompt('tenant-hvac-authored')

    expect(prompt).toContain('Owner-authored: what type of unit do you have?')
    expect(prompt).not.toContain('Ask tune-up, repair, install, or duct cleaning — system type.')
  })

  it('a legacy tenant with no checklist_fields still gets the generic fallback in the RENDERED prompt (no regression)', async () => {
    tenantRow = {
      name: 'Acme HVAC', phone: '555-1234', email: 'hi@acmehvac.com', domain: 'acmehvac.com',
      website_url: null, industry: 'hvac', agent_name: 'Jefe', address: null,
      selena_config: {},
    }

    const prompt = await runtimePrompt('tenant-legacy')

    expect(prompt).toContain('Where are you located?')
    expect(prompt).toContain('When do you need it?')
  })
})
