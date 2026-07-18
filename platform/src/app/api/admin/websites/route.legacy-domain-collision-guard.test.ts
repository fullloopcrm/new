import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/websites — legacy tenants.domain collision guard.
 *
 * BUG (fixed here): this is the ONE write site to tenant_domains (the
 * resolver's PRIMARY host-routing source). tenant_domains.domain is UNIQUE at
 * the DB level, so a collision with ANOTHER tenant_domains row already
 * 23505s and is handled gracefully (route.duplicate-domain.test.ts). But
 * that constraint only guards tenant_domains against ITSELF — it has no
 * relationship to tenants.domain (the resolver's FALLBACK source), which
 * carries no unique constraint at all. A prior round wired findDomainOwner
 * into the three tenants.domain write sites (admin/businesses POST,
 * admin/businesses/[id] PUT, admin/tenants/[id] PUT) to check tenant_domains
 * before writing the legacy column, but explicitly dismissed this endpoint as
 * "already has its own protection" — true for tenant_domains-vs-itself, false
 * for tenant_domains-vs-legacy-tenants.domain. Without this check, an admin
 * could insert a tenant_domains row for a domain some OTHER, not-yet-migrated
 * tenant already serves via tenants.domain: the insert succeeds with a clean
 * 201, and the resolver's TRANSITION ASSERT-AND-REFUSE divergence guard
 * (getTenantByDomain in tenant-lookup.ts/tenant.ts) throws TENANT_DIVERGENCE
 * on the very next real request to that host — darkening the other,
 * already-live tenant's site.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { POST } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_B, slug: 'bravo', name: 'Bravo Co', domain: 'bravo-legacy.com' },
    ] as Record<string, unknown>[],
    tenant_domains: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: unknown) {
  return POST(new NextRequest('http://t/api/admin/websites', { method: 'POST', body: JSON.stringify(body) }))
}

function insertedDomains(tenantId: string): string[] {
  return (h.seed.tenant_domains as Record<string, unknown>[])
    .filter((r) => r.tenant_id === tenantId)
    .map((r) => r.domain as string)
}

describe('POST /api/admin/websites — legacy tenants.domain collision guard', () => {
  it('CROSS-TENANT PROBE: rejects registering a domain another tenant already owns via legacy tenants.domain, and never inserts it', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'bravo-legacy.com' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/bravo-legacy\.com is already registered to Bravo Co/)
    expect(insertedDomains(TENANT_A)).toEqual([])
  })

  it('a differently-cased/prefixed submission still normalizes and collides with the legacy owner', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'https://WWW.Bravo-Legacy.com/' })
    expect(res.status).toBe(409)
    expect(insertedDomains(TENANT_A)).toEqual([])
  })

  it('self-migration: a tenant registering its OWN legacy domain into tenant_domains is not a false-positive collision', async () => {
    const res = await post({ tenant_id: TENANT_B, domain: 'bravo-legacy.com' })
    expect(res.status).toBe(201)
    expect(insertedDomains(TENANT_B)).toEqual(['bravo-legacy.com'])
  })

  it('a genuinely free domain (no legacy owner) is accepted normally', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'freshdomain.com' })
    expect(res.status).toBe(201)
    expect(insertedDomains(TENANT_A)).toEqual(['freshdomain.com'])
  })
})
