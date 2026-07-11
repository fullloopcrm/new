import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * F1 — getSettings().funnel_mode. When a tenant's selena_config carries no
 * explicit funnel_mode (every tenant provisioned before funnel_mode was seeded),
 * the resolved funnel must come from the TRADE ARCHETYPE: project/lead verticals
 * quote-first ('pipeline'), everything else books. An explicit selena_config
 * choice always wins.
 *
 * Supabase is mocked: the tenants query resolves via .single(); the service_types
 * query resolves via the terminal .order().
 */

let tenantRow: Record<string, unknown> | null
let serviceRows: unknown[]

function builder(table: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => Promise.resolve({ data: serviceRows, error: null }),
    single: async () => ({ data: table === 'tenants' ? tenantRow : null, error: null }),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (t: string) => builder(t) },
  supabase: { from: (t: string) => builder(t) },
}))

import { getSettings, clearSettingsCache } from './settings'

beforeEach(() => {
  clearSettingsCache()
  serviceRows = []
  tenantRow = null
})

describe('getSettings funnel_mode — archetype default (F1)', () => {
  it('project vertical with empty selena_config resolves to pipeline (quote-first)', async () => {
    tenantRow = { id: 't-roof', name: 'Ace Roofing', industry: 'roofing', selena_config: {} }
    const s = await getSettings('t-roof')
    expect(s.funnel_mode).toBe('pipeline')
  })

  it('booking trade with empty selena_config stays on booking', async () => {
    tenantRow = { id: 't-clean', name: 'Sparkle Maids', industry: 'cleaning', selena_config: {} }
    const s = await getSettings('t-clean')
    expect(s.funnel_mode).toBe('booking')
  })

  it('explicit selena_config.funnel_mode overrides the archetype default', async () => {
    // Owner deliberately set a roofing tenant to direct booking — honor it.
    tenantRow = { id: 't-roof2', name: 'DIY Roofing', industry: 'roofing', selena_config: { funnel_mode: 'booking' } }
    const s = await getSettings('t-roof2')
    expect(s.funnel_mode).toBe('booking')
  })

  it('explicit lead_only is preserved', async () => {
    tenantRow = { id: 't-lead', name: 'Lead Co', industry: 'roofing', selena_config: { funnel_mode: 'lead_only' } }
    const s = await getSettings('t-lead')
    expect(s.funnel_mode).toBe('lead_only')
  })
})
