import { describe, it, expect, vi } from 'vitest'

/**
 * resolveBasePlaybook() is the single dispatch point that replaced an inline
 * `if (tenantId === NYCMAID_TENANT_ID)` branch in agent.ts's core loop. Two
 * things must hold:
 *   1. nycmaid gets her verbatim authored playbook back, untouched — no
 *      persona/config machinery runs for her at all.
 *   2. every other tenant runs the real getAgentConfig -> getPersona ->
 *      applyPersonaToConfig -> buildPlaybook -> renderPersonaExtras chain.
 */

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  },
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

import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { NYCMAID_PLAYBOOK } from './tenants/nycmaid'
import { resolveBasePlaybook } from './resolve-base-prompt'

describe('resolveBasePlaybook', () => {
  it('returns nycmaid\'s verbatim authored playbook, unchanged, for the nycmaid tenant', async () => {
    const result = await resolveBasePlaybook(NYCMAID_TENANT_ID)
    expect(result).toBe(NYCMAID_PLAYBOOK)
  })

  it('runs the config-driven playbook chain for a non-nycmaid tenant', async () => {
    const result = await resolveBasePlaybook('some-other-tenant-id')
    // Generic fallback checklist question — proves getAgentConfig/buildPlaybook
    // actually ran rather than falling through to nycmaid's playbook by accident.
    expect(result).toContain('Where are you located?')
    expect(result).not.toBe(NYCMAID_PLAYBOOK)
  })
})
