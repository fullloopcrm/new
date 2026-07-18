/**
 * activate-tenant.ts activation-triggered service provisioning.
 *
 * Confirms the mechanism P1/W1 was asked to verify: activateTenant() calls
 * provisionTenant() (already wired since 52e0e81b, well before this task),
 * and that the activation call path seeds service_types with the industry
 * preset's names/durations but ZERO pricing (default_hourly_rate/price_cents
 * both 0) so operators fill in real rates themselves — per Jeff's request,
 * this only applies to the activation auto-seed path; provisionTenant's
 * zeroPricing option defaults false for any other caller (e.g. the manual
 * POST /api/admin/businesses/[id]/provision endpoint).
 *
 * Full integration test: supabaseAdmin is mocked repo-wide via fake-supabase,
 * so activateTenant's real dependency chain (provisionTenant, onboarding-gate,
 * etc.) all read/write the same in-memory store. No Vercel/geocoding env vars
 * are set in the test environment, so external calls take their documented
 * no-op "skipped" paths without any network call.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { activateTenant } from './activate-tenant'
import { provisionTenant } from './provision-tenant'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'

function seed(industry: string) {
  fake._store.clear()
  fake._seed('tenants', [
    {
      id: TENANT_ID,
      name: 'Test Plumbing Co',
      slug: 'test-plumbing-co',
      industry,
      status: 'pending',
      owner_email: null,
      owner_name: null,
      domain: null,
      domain_name: null,
      address: null,
      service_area_lat: null,
      service_area_lng: null,
      service_radius_miles: null,
      google_place_id: null,
      selena_config: {},
    },
  ])
}

describe('activation auto-seeds services with zero pricing', () => {
  it('seeds service_types via activateTenant with real names but 0 pricing', async () => {
    seed('plumbing')

    await activateTenant(TENANT_ID)

    const seeded = fake._store.get('service_types') || []
    const tenantServices = seeded.filter((r) => r.tenant_id === TENANT_ID)

    // plumbing has 4 preset services (Service Call, Drain Cleaning, Water
    // Heater Install, Emergency Plumbing) — confirms the real per-industry
    // count is nowhere near 25; expanding preset content is a separate
    // authoring task, not something this fix can produce.
    expect(tenantServices.length).toBe(4)
    expect(tenantServices.map((s) => s.name)).toContain('Service Call')

    for (const svc of tenantServices) {
      expect(svc.default_hourly_rate).toBe(0)
      expect(svc.price_cents).toBe(0)
    }
  })

  it('leaves pricing intact for a direct provisionTenant call without zeroPricing', async () => {
    seed('plumbing')

    await provisionTenant({ tenantId: TENANT_ID, industry: 'plumbing' })

    const seeded = fake._store.get('service_types') || []
    const tenantServices = seeded.filter((r) => r.tenant_id === TENANT_ID)

    expect(tenantServices.length).toBe(4)
    const serviceCall = tenantServices.find((s) => s.name === 'Service Call')
    expect(serviceCall?.default_hourly_rate).toBe(135)
    expect(serviceCall?.price_cents).toBe(13500)
  })
})
