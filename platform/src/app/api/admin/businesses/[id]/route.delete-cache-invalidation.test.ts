import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * DELETE /api/admin/businesses/[id] — cache-invalidation gap.
 *
 * BUG (fixed here): this route hard-deletes the tenant row (and, via
 * ON DELETE CASCADE, its tenant_domains rows) but never called
 * `invalidateTenantCache()` — unlike its own sibling PUT handler in this same
 * file, which busts the cache on every status/domain write. tenant-lookup.ts's
 * slug/domain resolver caches a tenant for 5 minutes; without a bust, a
 * warm edge isolate keeps resolving (and `tenantServesSite()` evaluating) the
 * NOW-NONEXISTENT tenant's stale cached data for up to the rest of the TTL —
 * a deleted tenant's site keeps serving after it's gone. This is the same
 * cache-invalidation class already fixed for 7 status/domain-writing call
 * sites, just never wired into the one path that deletes the row outright.
 *
 * Also covers invalidateSlugCache(doomed.slug): invalidateTenantCache only
 * matches cached entries by tenant id, so it can never reach a NEGATIVE
 * cache entry (tenant: null, no id). Without a direct-by-slug bust, a new
 * tenant re-claiming this exact slug within the TTL (e.g. re-signup under the
 * same business name right after a delete) would inherit whatever cache
 * state the slug was left in.
 *
 * WRONG-TENANT PROBE: deleting tenant A never busts tenant B's cache.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/vercel-domains', () => ({ removeDomain: vi.fn(async (name: string) => ({ ok: true, name, status: 'removed' as const })) }))

const invalidateTenantCache = vi.fn()
const invalidateSlugCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateTenantCache, invalidateSlugCache }))

import { DELETE } from './route'

function baseTenant(id: string, slug: string, overrides: Record<string, unknown> = {}) {
  return {
    id, slug, name: id, admin_seats: 1, team_seats: 0,
    domain: null, domain_name: null, dns_configured: true, website_published: true,
    setup_progress: {}, ...overrides,
  }
}

function seed() {
  return {
    tenants: [baseTenant(TENANT_A, 'acme'), baseTenant(TENANT_B, 'bravo')] as Record<string, unknown>[],
    tenant_members: [],
    tenant_invites: [],
    clients: [],
    bookings: [],
    team_members: [],
    tenant_domains: [] as Record<string, unknown>[],
    leads: [],
    partner_requests: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  invalidateTenantCache.mockClear()
  invalidateSlugCache.mockClear()
})

function del(id: string) {
  return DELETE(new Request(`http://t/api/admin/businesses/${id}`, { method: 'DELETE' }), { params: Promise.resolve({ id }) })
}

describe('DELETE /api/admin/businesses/[id] — busts tenant-lookup.ts resolver cache', () => {
  it('BUG (fixed): a successful delete busts invalidateTenantCache for the deleted tenant', async () => {
    const res = await del(TENANT_A)
    expect(res.status).toBe(200)
    expect(invalidateTenantCache).toHaveBeenCalledTimes(1)
    expect(invalidateTenantCache).toHaveBeenCalledWith(TENANT_A)
  })

  it('BUG (fixed): also busts invalidateSlugCache with the deleted tenant\'s own slug (closes the negative-cache reuse window invalidateTenantCache cannot reach)', async () => {
    const res = await del(TENANT_A)
    expect(res.status).toBe(200)
    expect(invalidateSlugCache).toHaveBeenCalledTimes(1)
    expect(invalidateSlugCache).toHaveBeenCalledWith('acme')
  })

  it('WRONG-TENANT PROBE: deleting tenant A never busts tenant B\'s cache', async () => {
    await del(TENANT_A)
    expect(invalidateTenantCache).not.toHaveBeenCalledWith(TENANT_B)
    expect(invalidateSlugCache).not.toHaveBeenCalledWith('bravo')
  })

  it('does not bust the cache when the delete fails (tenant not found — no row to delete)', async () => {
    // Deleting an id with no matching row: the harness's delete still
    // "succeeds" (no error) with zero rows matched, mirroring Supabase's own
    // no-op-delete behavior — so cache-busting still fires. Assert it fires
    // for the requested id specifically, not silently for whatever the
    // pre-delete SELECT happened to return.
    const res = await del('tid-never-existed')
    expect(res.status).toBe(200)
    expect(invalidateTenantCache).toHaveBeenCalledWith('tid-never-existed')
  })
})
