import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/settings — primaryDomain resolution probe.
 *
 * BUG (fixed here, two stacked issues):
 * 1. dashboard/websites/page.tsx read fields straight off the top-level
 *    fetch('/api/settings') response (`data.domain`, `data.dns_configured`,
 *    etc.), but this route has always nested the tenant row under `tenant`
 *    (`{ tenant: safeTenant }`) — every field the page read was therefore
 *    always `undefined`, so the whole Website setup-status page showed
 *    "No domain set" / "DNS not configured" / "Not Published" regardless of
 *    the tenant's actual state.
 * 2. Even with the shape fixed, the page's "Domain configured" check only
 *    ever looked at the legacy tenant.domain/domain_name columns — the same
 *    bug class already fixed for tenantSiteUrl(), resolveOrigin(),
 *    onboarding-gate.ts, tenant-sitemap, etc: a tenant whose live custom
 *    domain lives only in tenant_domains (added via admin/websites) showed
 *    as having no domain configured on its own status page.
 *
 * FIX: GET now also returns a resolved `primaryDomain` (tenant_domains
 * PRIMARY row first, via the same getPrimaryTenantDomain() every other
 * resolver-precedence fix in this lane uses), scoped to the requesting
 * tenant's own tenantId. dashboard/websites/page.tsx reads `data.tenant.*`
 * and prefers `data.primaryDomain`.
 */

const A = 'tid-a'
const B = 'tid-b'

const TENANT_ROW = { id: A, name: 'Acme', domain: 'legacy-acme.com', domain_name: null }

// vi.hoisted() callbacks run before any other top-level statement in this
// file (that's the point — vi.mock factories below need it ready when they
// execute) — so this can't reference the `A` const declared above (TDZ).
// Literal duplicated intentionally; asserted equal to `A` isn't needed since
// both are the same string.
const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tid-a' as string }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: roleHolder.tenantId,
      tenant: { ...TENANT_ROW, id: roleHolder.tenantId },
      role: roleHolder.role,
    })),
  }
})

const getPrimaryTenantDomain = vi.fn<(tenantId: string) => Promise<string | null>>()
vi.mock('@/lib/domains', () => ({
  getPrimaryTenantDomain: (tenantId: string) => getPrimaryTenantDomain(tenantId),
}))

import { GET } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = A
  getPrimaryTenantDomain.mockReset()
})

describe('GET /api/settings — primaryDomain resolution probe', () => {
  it('returns the tenant_domains PRIMARY row when one exists, ahead of the legacy tenant.domain column', async () => {
    getPrimaryTenantDomain.mockResolvedValue('custom-primary.com')
    const res = await GET()
    const body = await res.json()
    expect(body.primaryDomain).toBe('custom-primary.com')
    // legacy column stays present, raw, for the settings-edit form
    expect(body.tenant.domain).toBe('legacy-acme.com')
  })

  it('falls back to null when the tenant has no tenant_domains row — caller falls back to tenant.domain', async () => {
    getPrimaryTenantDomain.mockResolvedValue(null)
    const res = await GET()
    const body = await res.json()
    expect(body.primaryDomain).toBeNull()
    expect(body.tenant.domain).toBe('legacy-acme.com')
  })

  it('WRONG-TENANT PROBE: resolves primaryDomain scoped to the REQUESTING tenant only, never another tenant\'s', async () => {
    getPrimaryTenantDomain.mockImplementation(async (tenantId: string) =>
      tenantId === A ? 'a-domain.com' : 'b-domain.com',
    )

    roleHolder.tenantId = A
    const resA = await GET()
    const bodyA = await resA.json()
    expect(bodyA.primaryDomain).toBe('a-domain.com')
    expect(getPrimaryTenantDomain).toHaveBeenLastCalledWith(A)

    roleHolder.tenantId = B
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.primaryDomain).toBe('b-domain.com')
    expect(getPrimaryTenantDomain).toHaveBeenLastCalledWith(B)
    // Never cross-served the other tenant's resolved domain.
    expect(bodyB.primaryDomain).not.toBe(bodyA.primaryDomain)
  })

  it("PERMISSION PROBE: 'staff' (no settings.view) never triggers domain resolution, gets no primaryDomain", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.primaryDomain).toBeUndefined()
    expect(getPrimaryTenantDomain).not.toHaveBeenCalled()
  })
})
