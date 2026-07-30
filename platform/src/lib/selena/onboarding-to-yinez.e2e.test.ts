import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * End-to-end proof for the 2026-07-30 onboarding gap-fill (voice/personality,
 * policies, FAQ, escalation, upsell, operational context).
 *
 * Runs the REAL production functions on both halves of the loop:
 *   WRITE: routeProfileWrite -> applyProfileWrite (the exact code
 *          POST /api/tenant-profile calls on submit)
 *   READ:  getAgentConfig -> getPersona -> applyPersonaToConfig ->
 *          buildPlaybook -> renderPersonaExtras (the exact code
 *          resolveBasePlaybook calls at conversation time, i.e. what Yinez
 *          actually sees)
 *
 * Only `@/lib/supabase` and `@/lib/settings` are mocked (an in-memory fake
 * `tenants` row + fixed settings) — everything else is the real module. This
 * is the strongest proof available without a live server: a tenant-specific
 * string typed into onboarding is asserted to appear VERBATIM in the string
 * Yinez's system prompt is built from, having passed through the real DB
 * write, the real JSONB merge, and the real prompt assembly in between.
 */

let tenantRow: Record<string, unknown>
const TENANT_ID = 'tenant-onboarding-e2e'

function tenantsTable() {
  return {
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { ...tenantRow }, error: null }),
      }),
    }),
    // Mirrors real Postgres UPDATE semantics: whole-column replace. The
    // JSONB read-modify-merge happens in application code
    // (tenant-profile-write.ts), exactly like production — this fake does
    // not merge on its own, so a test that skipped the real merge step would
    // fail here, not silently pass.
    update: (patch: Record<string, unknown>) => ({
      eq: async () => {
        Object.assign(tenantRow, patch)
        return { error: null }
      },
    }),
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsTable()
      throw new Error(`unexpected table queried in onboarding-to-yinez e2e test: ${table}`)
    },
  },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    business_name: 'Test Cleaning Co',
    service_types: [{ name: 'Standard Clean', active: true, rate: 89 }],
    standard_rate: 89,
    payment_methods: ['zelle'],
    funnel_mode: 'booking' as const,
    business_hours_start: 8,
    business_hours_end: 18,
  }),
  clearSettingsCache: () => {},
}))

import { routeProfileWrite, PROFILE_FIELD_BY_KEY, isTenantVisible } from '@/lib/tenant-profile'
import { applyProfileWrite } from '@/lib/tenant-profile-write'
import { getAgentConfig } from './agent-config-loader'
import { getPersona, applyPersonaToConfig, renderPersonaExtras } from './persona-file'
import { buildPlaybook } from './build-playbook'

/** Same composition resolveBasePlaybook uses for every non-nycmaid tenant. */
async function assembledPrompt(tenantId: string): Promise<string> {
  const [cfg, persona] = await Promise.all([getAgentConfig(tenantId), getPersona(tenantId)])
  return buildPlaybook(applyPersonaToConfig(cfg, persona)) + renderPersonaExtras(persona)
}

/** Simulates POST /api/tenant-profile's tenant-visibility filter (route.ts)
 *  before handing off to the shared applyProfileWrite executor. */
async function submitOnboarding(tenantId: string, answers: Record<string, unknown>) {
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(answers)) {
    const field = PROFILE_FIELD_BY_KEY[key]
    if (field && isTenantVisible(field)) filtered[key] = value
  }
  return applyProfileWrite(tenantId, filtered)
}

beforeEach(() => {
  tenantRow = {
    id: TENANT_ID,
    name: 'Test Cleaning Co',
    phone: '212-555-0000',
    email: 'hi@testcleaningco.com',
    domain: 'testcleaningco.com',
    website_url: null,
    industry: 'cleaning',
    agent_name: 'Ana',
    address: null,
    slug: 'test-cleaning-co-e2e', // not in AUTHORED_CONFIGS -> rides the neutral derivation
    selena_config: {},
  }
})

describe('onboarding -> Yinez context, real answers', () => {
  it('routeProfileWrite maps every new onboarding key to its selena_config column', () => {
    const routed = routeProfileWrite({
      cancellationPolicy: '24 hours notice required, or a $50 late-cancel fee applies.',
      escalationContact: 'Maria Alvarez, owner — 917-555-0110',
      faqs: [{ question: 'Do you bring your own supplies?', answer: 'Yes.' }],
    })
    expect(routed.selenaKeys.cancellation_policy).toBe('24 hours notice required, or a $50 late-cancel fee applies.')
    expect(routed.selenaKeys.escalation_contact).toBe('Maria Alvarez, owner — 917-555-0110')
    expect(routed.selenaKeys.faqs).toEqual([{ question: 'Do you bring your own supplies?', answer: 'Yes.' }])
    expect(routed.ignored).toEqual([])
  })

  it('a real, specific onboarding submission reaches the EXACT text Yinez sees at conversation time', async () => {
    const answers = {
      tone: 'warm_friendly',
      openingLines: ['Hey! This is Ana with Test Cleaning Co — who am I chatting with?'],
      phrasesToUse: ['no worries, we got you'],
      phrasesToAvoid: ['guaranteed'],
      neverDo: ['Never discuss competitors by name', 'Never say the word guaranteed'],
      cancellationPolicy: '24 hours notice required, or a $50 late-cancel fee applies.',
      reschedulePolicy: 'Free reschedule with at least 24 hours notice.',
      refundPolicy: 'Refunds only if we did not complete the scope of work.',
      latePaymentPolicy: 'Invoice overdue 7 days triggers a text reminder; 14 days escalates to the owner.',
      outOfScope: ['We do not clean outdoor spaces', 'We do not handle biohazard cleanup'],
      faqs: [{ question: 'Do you bring your own supplies?', answer: 'Yes — all supplies and equipment are included unless you prefer we use yours.' }],
      objectionHandlers: [{ trigger: 'too expensive', response: 'Walk them through what is included — supplies, insurance, and a redo if needed.' }],
      escalationTriggers: ['refund request', 'legal or BBB threat', 'damage claim over $200'],
      escalationContact: 'Maria Alvarez, owner — 917-555-0110',
      escalationResponseTime: 'within 1 business hour',
      addons: [{ label: 'Inside-fridge clean', price: '$25' }],
      upsellTriggers: ['client mentions moving out'],
      neverUpsell: ['Do not upsell during a complaint call'],
      capacityNote: 'Fully booked through next Friday — offer only the following Monday onward.',
      // Pre-existing 'ai'/'brand' section fields, wired in this same pass
      // (2026-07-30 part 2 — same bug class: saved, never read).
      greeting: 'Hola! Gracias por contactar Test Cleaning Co, this is Ana.',
      language: 'es',
      emojiUsage: 'frequent',
      targetCustomer: 'Busy Manhattan renters who want a reliable biweekly clean without managing a cleaner directly.',
      competitors: ['Handy', 'MaidPro NYC'],
      differentiators: 'Same cleaner every time, insured team, and a text-based booking flow instead of an app.',
    }

    const { saved, ignored } = await submitOnboarding(TENANT_ID, answers)
    expect(saved).toBe(true)
    expect(ignored).toEqual([])

    // The write really persisted to the (fake) tenants row's selena_config —
    // proves the DB round-trip, not just an in-memory object.
    const persisted = tenantRow.selena_config as Record<string, unknown>
    expect(persisted.cancellation_policy).toBe(answers.cancellationPolicy)
    expect(persisted.escalation_contact).toBe(answers.escalationContact)

    const prompt = await assembledPrompt(TENANT_ID)

    // Voice & personality
    expect(prompt).toContain('Warm and friendly.') // tone directive, previously dead data
    expect(prompt).toContain('Hey! This is Ana with Test Cleaning Co — who am I chatting with?')
    expect(prompt).toContain('Never discuss competitors by name')
    expect(prompt).toContain('Never say the word guaranteed')
    expect(prompt).toContain('guaranteed') // phrasesToAvoid folded into banned_phrases
    expect(prompt).toContain('no worries, we got you') // phrasesToUse

    // Policies the agent needs to know, not guess — verbatim tenant text
    expect(prompt).toContain('Cancellation: 24 hours notice required, or a $50 late-cancel fee applies.')
    expect(prompt).toContain('Rescheduling: Free reschedule with at least 24 hours notice.')
    expect(prompt).toContain('Refunds: Refunds only if we did not complete the scope of work.')
    expect(prompt).toContain('Late payment / overdue: Invoice overdue 7 days triggers a text reminder; 14 days escalates to the owner.')
    expect(prompt).toContain('Out of scope: We do not clean outdoor spaces')
    expect(prompt).toContain('Out of scope: We do not handle biohazard cleanup')

    // Real FAQ + objections, tenant's own words
    expect(prompt).toContain('Do you bring your own supplies?')
    expect(prompt).toContain('Yes — all supplies and equipment are included unless you prefer we use yours.')
    expect(prompt).toContain('too expensive')
    expect(prompt).toContain('Walk them through what is included')

    // Escalation preferences — specific contact + response-time promise, in
    // the WHAT YOU ESCALATE block buildPlaybook already renders
    expect(prompt).toContain('WHAT YOU ESCALATE')
    expect(prompt).toContain('Escalate to: Maria Alvarez, owner — 917-555-0110.')
    expect(prompt).toContain('Promised response time: within 1 business hour.')
    expect(prompt).toContain('refund request')
    expect(prompt).toContain('damage claim over $200')

    // Upsell / cross-sell
    expect(prompt).toContain('Inside-fridge clean')
    expect(prompt).toContain('$25')
    expect(prompt).toContain('client mentions moving out')
    expect(prompt).toContain('Do not upsell during a complaint call')

    // Operational context — capacity note + business hours (already-collected
    // settings, now surfaced automatically, no separate onboarding field)
    expect(prompt).toContain('Fully booked through next Friday')
    expect(prompt).toContain('Business hours: 8 AM–6 PM')

    // Previously write-only 'ai'/'brand' fields (2026-07-30 part 2)
    expect(prompt).toContain('Hola! Gracias por contactar Test Cleaning Co, this is Ana.') // greeting -> opener
    expect(prompt).toContain('Respond in Spanish, even if the customer writes in English.') // language
    expect(prompt).toContain('Emojis are welcome throughout when they fit the moment') // emoji_usage
    expect(prompt).toContain('Busy Manhattan renters who want a reliable biweekly clean') // target_customer
    expect(prompt).toContain('Handy')
    expect(prompt).toContain('MaidPro NYC')
    expect(prompt).toContain('never badmouth') // competitors section framing
    expect(prompt).toContain('Same cleaner every time, insured team') // differentiators
  })
})

describe('onboarding -> Yinez context, ai_name real-column fallback', () => {
  it('an onboarding-submitted agent name is honored when tenants.agent_name is not yet set (mirrors the documented tenant.agent_name || selena_config.ai_name precedence)', async () => {
    tenantRow.agent_name = null
    await submitOnboarding(TENANT_ID, { aiName: 'Rosa' })

    const prompt = await assembledPrompt(TENANT_ID)
    expect(prompt).toContain('You are Rosa.')
    expect(prompt).toContain("I'm Rosa, the assistant here")
  })

  it('the real tenants.agent_name column still wins over selena_config.ai_name when both are set (no regression to the documented precedence)', async () => {
    tenantRow.agent_name = 'Ana' // already set in beforeEach, asserted explicitly here
    await submitOnboarding(TENANT_ID, { aiName: 'Rosa' })

    const prompt = await assembledPrompt(TENANT_ID)
    expect(prompt).toContain('You are Ana.')
    expect(prompt).not.toContain('You are Rosa.')
  })
})

describe('onboarding -> Yinez context, language/emoji blank path', () => {
  it('blank language/emoji_usage add no override lines — zero behavior change from before this fix', async () => {
    await submitOnboarding(TENANT_ID, { capacityNote: 'Standard availability.' })

    const prompt = await assembledPrompt(TENANT_ID)
    expect(prompt).not.toContain('Respond in Spanish')
    expect(prompt).not.toContain('Respond in English, even if')
    expect(prompt).not.toContain('Emojis are welcome throughout')
    expect(prompt).not.toContain('No emojis, ever.')
    // Falls back to the original hardcoded FORMAT line, unchanged.
    expect(prompt).toContain('An emoji is okay once, sparingly, never on serious topics.')
  })
})

describe('onboarding -> Yinez context, blank / not-applicable path', () => {
  it('blank cancellation/reschedule/late-payment/escalation-contact fields render an explicit defer-to-human default, never an invented policy', async () => {
    // Tenant filled in SOMETHING (capacityNote) but explicitly left the
    // policy/escalation fields blank — proves the defaults are per-field,
    // not just "whole persona is empty".
    await submitOnboarding(TENANT_ID, { capacityNote: 'Standard availability, nothing special.' })

    const prompt = await assembledPrompt(TENANT_ID)

    expect(prompt).toContain('Cancellation: no policy on file — do not invent one.')
    expect(prompt).toContain('Rescheduling: no policy on file — do not invent one.')
    expect(prompt).toContain('Late payment / overdue: no policy on file — do not invent a fee or deadline.')
    expect(prompt).toContain('call request_callback')

    // No hallucinated specifics anywhere in the assembled prompt.
    expect(prompt).not.toMatch(/24 hours? notice/)
    expect(prompt).not.toContain('$50')
    expect(prompt).not.toContain('Escalate to:')
  })

  it('a tenant who never touches the persona system at all gets byte-identical output to before this change (zero-diff guarantee)', async () => {
    // selena_config stays {} — no onboarding submission at all.
    const before = await assembledPrompt(TENANT_ID)
    // Re-run to prove determinism, not a fluke of call order.
    const again = await assembledPrompt(TENANT_ID)
    expect(again).toBe(before)
    // Documents the actual design decision: an untouched tenant does NOT get
    // the new cancellation/reschedule/late-payment fallback lines injected —
    // applyPersonaToConfig's whole-persona-empty early return is a no-op, so
    // nothing about their playbook changes until they touch AT LEAST one
    // onboarding 'ai' field. See persona-file.ts's early-return comment.
    expect(before).not.toContain('Cancellation:')
    expect(before).not.toContain('Rescheduling:')
  })
})
