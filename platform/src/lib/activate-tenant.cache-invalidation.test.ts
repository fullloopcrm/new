import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * activateTenant() — cache-invalidation gap.
 *
 * BUG (fixed here): the final status flip to 'active' — THE activation path
 * every creation door funnels through, per this file's own header comment —
 * never called `invalidateTenantCache()`. Same class already fixed for the
 * admin-side status writes (admin/tenants/[id], admin/businesses/[id]) and
 * for this same file's OWN domain-cache bust a few lines above (line ~403,
 * `invalidateDomainCache` per landed domain) — but the tenant-level status
 * cache was left unbusted. Without it, a tenant whose slug/domain resolved
 * (and cached) at any point during the run-up to activation keeps resolving
 * through tenant-lookup.ts's warm-edge-isolate cache (tenantServesSite()
 * evaluating the STALE pre-active status) for up to the rest of the 5-min
 * TTL, immediately after this function reports the tenant as newly live.
 *
 * This test drives activateTenant() through a full pass to the terminal
 * status-flip branch (ready=true, tenant.status starting non-active) and
 * asserts invalidateTenantCache is called with the activated tenant's id.
 */

const T = 'tid-activate'
const SLUG = 'acme-co'

const TENANT_ROW = {
  id: T,
  name: 'Acme Co',
  slug: SLUG,
  industry: 'hvac',
  status: 'pending',
  owner_email: 'owner@acme.com',
  owner_name: 'Owner',
  domain: null,
  domain_name: null,
  address: null,
  service_area_lat: null,
  service_area_lng: null,
  service_radius_miles: 25,
}

vi.mock('./provision-tenant', () => ({
  provisionTenant: vi.fn(async () => ({ seeded: {}, skipped: [] })),
}))
vi.mock('./onboarding-tasks', () => ({
  seedOnboardingTasks: vi.fn(async () => {}),
}))
vi.mock('./ledger', () => ({
  seedChartOfAccounts: vi.fn(async () => 0),
}))
vi.mock('./hr', () => ({
  seedHrDefaults: vi.fn(async () => ({ requirementsSeeded: 0, profilesBackfilled: 0 })),
}))
vi.mock('./entity-provision', () => ({
  ensureDefaultEntity: vi.fn(async () => false),
}))
vi.mock('./onboarding-gate', () => ({
  runOnboardingGate: vi.fn(async () => ({ tenantId: T, passed: true, stages: [] })),
}))
vi.mock('./settings', () => ({
  clearSettingsCache: vi.fn(),
}))
vi.mock('./vercel-domains', () => ({
  registerCarryingDomain: vi.fn(async () => ({ ok: true, status: 'live', domain: `${SLUG}.fullloopcrm.com` })),
  registerCustomDomain: vi.fn(async () => ({ ok: true, verified: true, status: 'live', domain: 'unused.com' })),
}))
vi.mock('./seo/onboarding', () => ({
  registerSeoProperty: vi.fn(async () => null),
}))
vi.mock('./domains', () => ({
  reconcilePrimaryDomain: vi.fn(async () => {}),
}))
vi.mock('./geo/coverage', () => ({
  resolveCoverage: vi.fn(async () => ({ center: null, neighborhoods: [], areas: [] })),
}))
vi.mock('./admin-pin', () => ({
  hashAdminPin: vi.fn(() => 'hashed-pin'),
}))

const invalidateTenantCache = vi.fn()
const invalidateDomainCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateTenantCache, invalidateDomainCache }))

vi.mock('./supabase', () => {
  function thenable(result: unknown) {
    return { then: (resolve: (v: unknown) => void) => resolve(result) }
  }

  function tenantsTable() {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(() => ({ ...q, then: thenable({ error: null }).then }))
    q.update = vi.fn(self)
    q.single = vi.fn(async () => ({ data: TENANT_ROW, error: null }))
    q.maybeSingle = vi.fn(async () => ({ data: { google_place_id: 'gp1', selena_config: {} }, error: null }))
    return q
  }

  function countTable(count: number) {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(() => thenable({ count, error: null }))
    q.insert = vi.fn(async () => ({ data: null, error: null }))
    return q
  }

  function tenantMembersTable() {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(self)
    q.maybeSingle = vi.fn(async () => ({ data: { id: 'owner-1' }, error: null }))
    q.insert = vi.fn(async () => ({ data: null, error: null }))
    return q
  }

  function tenantDomainsTable() {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.upsert = vi.fn(async () => ({ error: null }))
    q.select = vi.fn(self)
    q.in = vi.fn(() => thenable({
      data: [{ domain: `${SLUG}.fullloopcrm.com`, tenant_id: T }],
      error: null,
    }))
    return q
  }

  function notificationsTable() {
    return { insert: vi.fn(async () => ({ data: null, error: null })) }
  }

  return {
    supabaseAdmin: {
      from: (table: string) => {
        if (table === 'tenants') return tenantsTable()
        if (table === 'onboarding_tasks') return countTable(3)
        if (table === 'team_members') return countTable(1)
        if (table === 'tenant_members') return tenantMembersTable()
        if (table === 'tenant_domains') return tenantDomainsTable()
        if (table === 'notifications') return notificationsTable()
        throw new Error(`unexpected table ${table}`)
      },
    },
  }
})

import { activateTenant } from './activate-tenant'

beforeEach(() => {
  invalidateTenantCache.mockClear()
  invalidateDomainCache.mockClear()
})

describe('activateTenant() — cache-invalidation gap', () => {
  it('busts the tenant-lookup status cache for the tenant it just flipped active', async () => {
    const result = await activateTenant(T)

    expect(result.ready).toBe(true)
    expect(result.activated).toBe(true)
    expect(invalidateTenantCache).toHaveBeenCalledTimes(1)
    expect(invalidateTenantCache).toHaveBeenCalledWith(T)
  })
})
