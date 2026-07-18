import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/businesses — negative-domain-cache bust gap (tenant creation).
 *
 * BUG (fixed here): tenant creation writes `domain: cleanDomain` straight into
 * the new `tenants` row but never called `invalidateDomainCache()`.
 * `tenants.domain` is the resolver's FALLBACK source of truth
 * (getTenantByDomain in tenant-lookup.ts step 2). `invalidateTenantCache`
 * can't cover this gap either way — it only sweeps POSITIVE cache entries by
 * tenant id, and a brand-new tenant has no prior positive entry to sweep. If
 * this exact host was ever queried (and negatively cached) before this
 * business was created — a DNS-not-pointed-yet probe, a bot, someone testing
 * the URL early during onboarding — it stays negatively cached ("no tenant")
 * for up to the rest of the 5-minute TTL despite the tenant now existing with
 * this exact domain, immediately after the admin form reports success.
 *
 * WRONG-DOMAIN PROBE: creating a tenant with domain A never busts a
 * DIFFERENT domain string's cache entry.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/vercel-domains', () => ({
  registerCarryingDomain: vi.fn(async (slug: string) => ({ ok: true, domain: `${slug}.fullloopcrm.com`, status: 'registered' as const })),
}))

const invalidateDomainCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateDomainCache }))

import { POST } from './route'

function seed() {
  return { tenants: [] as Record<string, unknown>[] }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  invalidateDomainCache.mockClear()
})

function post(body: unknown) {
  return POST(new Request('http://t/api/admin/businesses', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/admin/businesses — negative-domain-cache bust (creation)', () => {
  it('BUG (fixed): creating a tenant with a domain_name busts invalidateDomainCache for that exact (normalized) domain string', async () => {
    const res = await post({ name: 'Acme', industry: 'cleaning', domain_name: 'https://WWW.Acme.com/' })
    expect(res.status).toBe(200)
    expect(invalidateDomainCache).toHaveBeenCalledTimes(1)
    expect(invalidateDomainCache).toHaveBeenCalledWith('acme.com')
  })

  it('creating a tenant with no domain_name never calls invalidateDomainCache', async () => {
    const res = await post({ name: 'Bravo', industry: 'cleaning' })
    expect(res.status).toBe(200)
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })

  it('WRONG-DOMAIN PROBE: busts the cache only for the domain actually created, not some other string', async () => {
    await post({ name: 'Charlie', industry: 'cleaning', domain_name: 'charlie.com' })
    expect(invalidateDomainCache).not.toHaveBeenCalledWith('acme.com')
    expect(invalidateDomainCache).toHaveBeenCalledWith('charlie.com')
  })

  it('does not bust the cache when creation fails (duplicate slug)', async () => {
    h.seed.tenants.push({ id: 'existing', slug: 'delta', name: 'Delta' })
    const res = await post({ name: 'Delta', industry: 'cleaning', domain_name: 'delta.com' })
    expect(res.status).toBe(400)
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })
})
