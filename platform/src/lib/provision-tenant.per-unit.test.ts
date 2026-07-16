/**
 * provisionTenant() used to hardcode `per_unit: 'hour'` for every seeded
 * service_types row, and DEFAULT_SELENA_CONFIG hardcoded a "/hr" price suffix
 * for every trade's pricing_rows — so a brand-new dumpster/junk/moving tenant
 * got seeded quoting e.g. "$350/hr" for a flat-rate dumpster rental, which is
 * directly customer-facing via Selena's phone/chat pricing script. Both sites
 * now read PER_UNIT_BY_INDUSTRY (industry-presets.ts) instead.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { provisionTenant } from './provision-tenant'

const fake = supabaseAdmin as unknown as FakeSupabase

function seedTenant(id: string, overrides: Record<string, unknown> = {}) {
  fake._seed('tenants', [
    { id, name: 'Test Co', business_hours: null, payment_methods: null, guidelines_en: null, selena_config: null, ...overrides },
  ])
}

beforeEach(() => {
  fake._store.clear()
})

describe('provisionTenant — per_unit threading', () => {
  it('seeds service_types.per_unit as "job" for a flat-fee trade (dumpster)', async () => {
    seedTenant('t-dumpster')
    await provisionTenant({ tenantId: 't-dumpster', industry: 'dumpster' })
    const rows = fake._store.get('service_types') || []
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.per_unit).toBe('job')
  })

  it('seeds service_types.per_unit as "job" for junk_removal and moving too', async () => {
    seedTenant('t-junk')
    await provisionTenant({ tenantId: 't-junk', industry: 'junk_removal' })
    for (const row of fake._store.get('service_types') || []) expect(row.per_unit).toBe('job')

    seedTenant('t-moving')
    await provisionTenant({ tenantId: 't-moving', industry: 'moving' })
    for (const row of fake._store.get('service_types') || []) {
      if (row.tenant_id === 't-moving') expect(row.per_unit).toBe('job')
    }
  })

  it('still seeds service_types.per_unit as "hour" for a genuinely hourly trade (cleaning)', async () => {
    seedTenant('t-cleaning')
    await provisionTenant({ tenantId: 't-cleaning', industry: 'cleaning' })
    const rows = (fake._store.get('service_types') || []).filter(r => r.tenant_id === 't-cleaning')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.per_unit).toBe('hour')
  })

  it('labels Selena pricing_rows "flat" instead of "/hr" for a flat-fee trade', async () => {
    seedTenant('t-dumpster-2')
    await provisionTenant({ tenantId: 't-dumpster-2', industry: 'dumpster' })
    const tenants = fake._store.get('tenants') || []
    const tenant = tenants.find(t => t.id === 't-dumpster-2')
    const selena = tenant?.selena_config as { pricing_rows: { label: string; price: string }[] }
    expect(selena.pricing_rows.length).toBeGreaterThan(0)
    for (const row of selena.pricing_rows) {
      expect(row.price).toMatch(/ flat$/)
      expect(row.price).not.toMatch(/\/hr$/)
    }
  })

  it('still labels Selena pricing_rows "/hr" for a genuinely hourly trade', async () => {
    seedTenant('t-cleaning-2')
    await provisionTenant({ tenantId: 't-cleaning-2', industry: 'cleaning' })
    const tenants = fake._store.get('tenants') || []
    const tenant = tenants.find(t => t.id === 't-cleaning-2')
    const selena = tenant?.selena_config as { pricing_rows: { label: string; price: string }[] }
    expect(selena.pricing_rows.length).toBeGreaterThan(0)
    for (const row of selena.pricing_rows) expect(row.price).toMatch(/\/hr$/)
  })
})
