import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * PUT /api/settings — slug immutability probe.
 *
 * BUG (fixed here): this route only blocked `id` and `status` from the
 * blind tenants UPDATE; `slug` (the subdomain-routing key, getTenantBySlug
 * in tenant-lookup.ts, UNIQUE NOT NULL at the DB level) sailed through
 * unblocked. Neither admin PUT route (admin/businesses/[id],
 * admin/tenants/[id]) includes `slug` in its allowlist — nothing else in the
 * app ever mutates it post-creation. dashboard/settings/page.tsx's
 * saveTenant() round-trips the FULL tenant row (seeded from GET) on every
 * save, so `slug` is present on every normal request too; a crafted request
 * changing it would silently repoint the tenant's live subdomain with none
 * of the cache-busting a real slug change would need.
 *
 * FIX: `slug` is now deleted from the body alongside `id`/`status`, same as
 * every other write site's treatment of this field (never editable).
 */

const A = 'tid-a'

const tenantRow: Record<string, unknown> = { id: A, name: 'Acme', slug: 'acme-cleaning', domain: null, domain_name: null }

vi.mock('@/lib/domains', () => ({
  getPrimaryTenantDomain: vi.fn(async () => null),
  findDomainOwner: vi.fn(async () => null),
}))
vi.mock('@/lib/tenant-lookup', () => ({
  invalidateTenantCache: vi.fn(),
  invalidateDomainCache: vi.fn(),
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
  lastUpdatePatch = undefined
})

describe('PUT /api/settings — slug immutability probe', () => {
  it('strips `slug` from the update payload even when explicitly sent', async () => {
    const res = await PUT(req({ ...tenantRow, slug: 'stolen-slug' }))
    expect(res.status).toBe(200)
    expect(lastUpdatePatch?.slug).toBeUndefined()
  })

  it('a normal full-form save (slug round-tripped unchanged, as the dashboard always sends it) never writes slug', async () => {
    const res = await PUT(req({ ...tenantRow }))
    expect(res.status).toBe(200)
    expect(lastUpdatePatch?.slug).toBeUndefined()
    expect(lastUpdatePatch?.name).toBe('Acme')
  })
})
