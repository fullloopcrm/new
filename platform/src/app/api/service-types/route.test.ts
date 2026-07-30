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

const CATALOG_ROWS: Array<{ name: string; default_duration_hours: number | null; active: boolean }> = [
  { name: 'Standard Cleaning', default_duration_hours: 2, active: true },
  { name: 'Deep Cleaning', default_duration_hours: 3, active: true },
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
  })

  it('resolves the tenant via admin-impersonation session (no x-tenant-id header) and returns the catalog', async () => {
    h.getCurrentTenant.mockResolvedValue({ id: 'tenant-A' })

    const res = await GET()
    const json = await res.json()

    expect(json).toEqual([
      { name: 'Standard Cleaning', default_hours: 2, active: true },
      { name: 'Deep Cleaning', default_hours: 3, active: true },
    ])
  })

  it('returns an empty array when no tenant resolves at all', async () => {
    h.getCurrentTenant.mockResolvedValue(null)

    const res = await GET()
    const json = await res.json()

    expect(json).toEqual([])
  })
})
