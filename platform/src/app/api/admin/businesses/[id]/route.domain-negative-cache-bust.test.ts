import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/businesses/[id] — negative-domain-cache bust gap.
 *
 * BUG (fixed here): this handler busts tenant-lookup.ts's cache with
 * `invalidateTenantCache(id)` whenever `updates.domain` changes, but
 * `invalidateTenantCache` only sweeps POSITIVE cache entries — it matches by
 * `entry.tenant?.id`, which a negative ("no tenant") cache entry doesn't
 * carry (see tenant-lookup.ts's own invalidateTenantCache doc comment). This
 * is the identical structural gap already fixed for tenant_domains inserts
 * (admin/websites POST → invalidateDomainCache) and for slug reuse on delete
 * (this file's own DELETE handler → invalidateSlugCache) — but the write side
 * of the LEGACY tenants.domain fallback field (this PUT handler) never got
 * the same direct-by-domain-string bust.
 *
 * Concrete impact: `updates.domain` is exactly the host tenant-lookup.ts's
 * fallback step queries (getTenantByDomain step 2). If that host was ever
 * requested before this save — a DNS-not-pointed-yet probe, a bot, an admin
 * testing the URL early, or simply a brand-new tenant with no prior positive
 * cache entry to sweep — it stays negatively cached ("no tenant") for up to
 * the rest of the 5-minute TTL even after this write makes it a real, live
 * domain.
 *
 * WRONG-TENANT PROBE: saving tenant A's domain never busts a DIFFERENT
 * domain string's cache entry.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const invalidateTenantCache = vi.fn()
const invalidateDomainCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateTenantCache, invalidateDomainCache }))

import { PUT } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, slug: 'acme', name: 'Acme', domain: null, domain_name: null, admin_seats: 1, team_seats: 0 },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  invalidateTenantCache.mockClear()
  invalidateDomainCache.mockClear()
})

function put(body: unknown) {
  return PUT(
    new Request('http://t/api/admin/businesses/' + TENANT_A, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: TENANT_A }) },
  )
}

describe('PUT /api/admin/businesses/[id] — negative-domain-cache bust', () => {
  it('BUG (fixed): setting a new domain busts invalidateDomainCache for that exact (normalized) domain string', async () => {
    const res = await put({ domain: 'https://WWW.Acme.com/' })
    expect(res.status).toBe(200)
    expect(invalidateDomainCache).toHaveBeenCalledTimes(1)
    expect(invalidateDomainCache).toHaveBeenCalledWith('acme.com')
  })

  it('still busts invalidateTenantCache too (positive-cache side, unchanged behavior)', async () => {
    const res = await put({ domain: 'acme.com' })
    expect(res.status).toBe(200)
    expect(invalidateTenantCache).toHaveBeenCalledWith(TENANT_A)
  })

  it('clearing the domain (empty string -> null) does not call invalidateDomainCache with an empty/null value', async () => {
    const res = await put({ domain: '   https://  ' })
    expect(res.status).toBe(200)
    expect(invalidateTenantCache).toHaveBeenCalledWith(TENANT_A)
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })

  it('WRONG-TENANT PROBE: busts the domain cache only for the domain actually saved, not some other string', async () => {
    await put({ domain: 'acme.com' })
    expect(invalidateDomainCache).not.toHaveBeenCalledWith('bravo.com')
    expect(invalidateDomainCache).toHaveBeenCalledWith('acme.com')
  })

  it('no domain in the request body: neither cache fn is called for domain (status-only/no-op fields untouched)', async () => {
    const res = await put({ tagline: 'Fresh & clean' })
    expect(res.status).toBe(200)
    expect(invalidateTenantCache).not.toHaveBeenCalled()
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })
})
