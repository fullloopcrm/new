import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/tenants/[id] — negative-domain-cache bust gap.
 *
 * BUG (fixed here): same gap as admin/businesses/[id]'s identical PUT
 * handler. This route busts tenant-lookup.ts's cache with
 * `invalidateTenantCache(id)` whenever `updates.domain` changes, but
 * `invalidateTenantCache` only sweeps POSITIVE cache entries (matched by
 * `entry.tenant?.id` — a negative "no tenant" entry has none). `updates.domain`
 * is tenants.domain, the resolver's FALLBACK source: if this exact host was
 * ever queried (and negatively cached) before this save, it stays
 * unresolvable for up to the rest of the 5-minute TTL even after this write
 * makes it live.
 *
 * WRONG-TENANT PROBE: saving tenant A's domain never busts a DIFFERENT
 * domain string's cache entry.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/security', () => ({ logSecurityEvent: vi.fn(async () => {}) }))

const invalidateTenantCache = vi.fn()
const invalidateDomainCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({ invalidateTenantCache, invalidateDomainCache }))

import { PUT } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, slug: 'acme', name: 'Acme', domain: null, status: 'active' },
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
    new Request('http://t/api/admin/tenants/' + TENANT_A, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: TENANT_A }) },
  )
}

describe('PUT /api/admin/tenants/[id] — negative-domain-cache bust', () => {
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

  it('no domain in the request body: neither cache fn is called', async () => {
    const res = await put({ name: 'Acme Renamed' })
    expect(res.status).toBe(200)
    expect(invalidateTenantCache).not.toHaveBeenCalled()
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })
})
