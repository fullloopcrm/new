import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * PUT /api/settings — domain collision-guard + cache-invalidation probe.
 *
 * BUG (fixed here): this route is a BLOCKLIST (delete body.id/status/
 * systemOnlyFields, everything else flows straight into the blind tenants
 * UPDATE), unlike the ALLOWLIST-based admin routes (admin/businesses POST,
 * admin/businesses/[id] PUT, admin/tenants/[id] PUT) that already
 * special-case `domain` with a normalize + findDomainOwner collision guard
 * (see domains.ts's findDomainOwner doc comment). Being a blocklist, `domain`
 * was never special-cased here — it sailed through raw and uncollision-
 * checked straight into the tenants table.
 *
 * Worse than the admin routes: this one is reachable by any TENANT
 * owner/admin via their own dashboard (requirePermission('settings.edit') —
 * no platform-admin gate). Before this fix, any tenant could set its own
 * `domain` to a host ALREADY claimed by ANOTHER tenant (via tenant_domains or
 * that tenant's legacy tenants.domain), tripping the resolver's TRANSITION
 * ASSERT-AND-REFUSE divergence guard on the very next request to that host
 * and darkening the OTHER, already-live tenant's site.
 *
 * FIX: PUT now normalizes `domain` (lowercase, strip protocol/path/www) and
 * runs the same findDomainOwner(cleanDomain, tenantId) collision check as the
 * admin routes before writing, and busts tenant-lookup.ts's edge cache
 * (invalidateTenantCache + invalidateDomainCache) when domain changes —
 * mirroring admin/businesses/[id] PUT's existing fix for the same class of
 * staleness gap.
 */

const A = 'tid-a'
const B = 'tid-b'

const tenantRow: Record<string, unknown> = { id: A, name: 'Acme', domain: 'old-acme.com', domain_name: null }

const findDomainOwner = vi.fn<(domain: string, excludeTenantId?: string) => Promise<{ tenantId: string; tenantName: string; source: string } | null>>()
vi.mock('@/lib/domains', () => ({
  getPrimaryTenantDomain: vi.fn(async () => null),
  findDomainOwner: (domain: string, excludeTenantId?: string) => findDomainOwner(domain, excludeTenantId),
}))

const invalidateTenantCache = vi.fn()
const invalidateDomainCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({
  invalidateTenantCache: (id: string) => invalidateTenantCache(id),
  invalidateDomainCache: (domain: string) => invalidateDomainCache(domain),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenant: tenantRow, tenantId: A, userId: 'u1', role: 'owner' },
    error: null,
  })),
}))
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/security', () => ({ logSecurityEvent: vi.fn(async () => {}) }))
vi.mock('@/lib/secret-crypto', () => ({
  encryptTenantSecrets: (updates: Record<string, unknown>) => updates,
}))

let lastUpdatePatch: Record<string, unknown> | undefined
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table !== 'tenants') throw new Error(`unexpected table ${table}`)
      return {
        update(patch: Record<string, unknown>) {
          lastUpdatePatch = patch
          return {
            eq() {
              return {
                select() {
                  return {
                    single: async () => ({ data: { ...tenantRow, ...patch }, error: null }),
                  }
                },
              }
            },
          }
        },
      }
    },
  },
}))

import { PUT } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  findDomainOwner.mockReset()
  invalidateTenantCache.mockReset()
  invalidateDomainCache.mockReset()
  lastUpdatePatch = undefined
})

describe('PUT /api/settings — domain collision-guard probe', () => {
  it('rejects with 409 when the domain is already claimed by ANOTHER tenant, and never writes it', async () => {
    findDomainOwner.mockResolvedValue({ tenantId: B, tenantName: 'Other Co', source: 'tenant_domains' })

    const res = await PUT(req({ domain: 'already-taken.com' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('Other Co')
    expect(lastUpdatePatch).toBeUndefined()
  })

  it('WRONG-TENANT PROBE: collision check excludes the REQUESTING tenant itself, never another tenant\'s id', async () => {
    findDomainOwner.mockResolvedValue(null)

    await PUT(req({ domain: 'my-own-domain.com' }))

    expect(findDomainOwner).toHaveBeenCalledWith('my-own-domain.com', A)
    expect(findDomainOwner).not.toHaveBeenCalledWith('my-own-domain.com', B)
  })

  it('normalizes protocol/path/WWW/case before the collision check and the write', async () => {
    findDomainOwner.mockResolvedValue(null)

    const res = await PUT(req({ domain: 'https://WWW.Acme.com/some/path' }))
    expect(res.status).toBe(200)
    expect(findDomainOwner).toHaveBeenCalledWith('acme.com', A)
    expect(lastUpdatePatch?.domain).toBe('acme.com')
  })

  it('allows the write and busts the tenant + domain caches when no collision exists', async () => {
    findDomainOwner.mockResolvedValue(null)

    const res = await PUT(req({ domain: 'new-acme.com' }))
    expect(res.status).toBe(200)
    expect(lastUpdatePatch?.domain).toBe('new-acme.com')
    expect(invalidateTenantCache).toHaveBeenCalledWith(A)
    expect(invalidateDomainCache).toHaveBeenCalledWith('new-acme.com')
  })

  it('does not touch the domain caches when domain was not part of the update', async () => {
    findDomainOwner.mockResolvedValue(null)

    const res = await PUT(req({ name: 'Acme Renamed' }))
    expect(res.status).toBe(200)
    expect(findDomainOwner).not.toHaveBeenCalled()
    expect(invalidateTenantCache).not.toHaveBeenCalled()
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })

  it('leaves domain_name raw (no collision check) — it is display-only, not what the resolver queries', async () => {
    findDomainOwner.mockResolvedValue(null)

    const res = await PUT(req({ domain_name: 'Acme Cleaning Co.' }))
    expect(res.status).toBe(200)
    expect(findDomainOwner).not.toHaveBeenCalled()
    expect(lastUpdatePatch?.domain_name).toBe('Acme Cleaning Co.')
  })
})
