import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Live bug (2026-07-30): this route resolved the tenant via
 * getTenantFromHeaders() only, which requires the signed x-tenant-id header
 * middleware sets for a tenant's own custom domain. An admin working a
 * tenant from the platform's own super-admin panel (impersonation via
 * cookies, no x-tenant-id header on that path) always got tenant=null here,
 * so the Service dropdown in BookingsAdmin/CreateBookingForm silently
 * rendered empty -- confirmed via server logs showing a real 200 with an
 * empty array body, on two different tenants. Must resolve via
 * getCurrentTenant() (header OR admin-impersonation/Clerk session) instead.
 */

const h = vi.hoisted(() => ({
  getCurrentTenant: vi.fn(),
  getSettings: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({ getCurrentTenant: h.getCurrentTenant }))
vi.mock('@/lib/settings', () => ({ getSettings: h.getSettings }))

let CATALOG_ROWS: Array<{ name: string; default_duration_hours: number | null; default_hourly_rate: number | null; active: boolean }> = [
  { name: 'Standard Cleaning', default_duration_hours: 2, default_hourly_rate: 69, active: true },
  { name: 'Deep Cleaning', default_duration_hours: 3, default_hourly_rate: 89, active: true },
]

// Only reached when getCurrentTenant() actually resolved a tenant -- the
// no-tenant test returns before this route ever touches tenantDb.
vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: async () => ({ data: CATALOG_ROWS }),
          }),
        }),
      }),
    }),
  }),
}))

import { GET } from './route'

describe('GET /api/service-types', () => {
  beforeEach(() => {
    h.getCurrentTenant.mockReset()
    h.getSettings.mockReset()
    CATALOG_ROWS = [
      { name: 'Standard Cleaning', default_duration_hours: 2, default_hourly_rate: 69, active: true },
      { name: 'Deep Cleaning', default_duration_hours: 3, default_hourly_rate: 89, active: true },
    ]
  })

  it('resolves the tenant via admin-impersonation session (no x-tenant-id header) and returns the catalog, including default_hourly_rate', async () => {
    h.getCurrentTenant.mockResolvedValue({ id: 'tenant-A' })

    const res = await GET()
    const json = await res.json()

    expect(json).toEqual([
      { name: 'Standard Cleaning', default_hours: 2, default_hourly_rate: 69, active: true },
      { name: 'Deep Cleaning', default_hours: 3, default_hourly_rate: 89, active: true },
    ])
  })

  it('carries default_hourly_rate as null when a catalog row has no price set, instead of dropping the field', async () => {
    h.getCurrentTenant.mockResolvedValue({ id: 'tenant-A' })
    CATALOG_ROWS = [{ name: 'Pest Control', default_duration_hours: 1, default_hourly_rate: null, active: true }]

    const res = await GET()
    const json = await res.json()

    expect(json).toEqual([{ name: 'Pest Control', default_hours: 1, default_hourly_rate: null, active: true }])
  })

  it('normalizes the legacy settings.service_types fallback\'s "rate" field to default_hourly_rate, so the booking form only ever checks one field name', async () => {
    h.getCurrentTenant.mockResolvedValue({ id: 'tenant-B' })
    CATALOG_ROWS = []
    h.getSettings.mockResolvedValue({
      service_types: [
        { name: 'Standard Cleaning', default_hours: 2, rate: 69, active: true },
        { name: 'Inactive Service', default_hours: 2, rate: 50, active: false },
      ],
    })

    const res = await GET()
    const json = await res.json()

    expect(json).toEqual([
      { name: 'Standard Cleaning', default_hours: 2, rate: 69, active: true, default_hourly_rate: 69 },
    ])
  })

  it('returns an empty array when no tenant resolves at all', async () => {
    h.getCurrentTenant.mockResolvedValue(null)

    const res = await GET()
    const json = await res.json()

    expect(json).toEqual([])
  })
})
