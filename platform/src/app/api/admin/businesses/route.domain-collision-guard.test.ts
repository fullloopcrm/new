import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/businesses — domain collision guard (tenant creation).
 *
 * BUG (fixed here): tenant creation wrote the caller-supplied `domain_name`
 * straight into the new tenant's `tenants.domain` with no check that another,
 * EXISTING tenant doesn't already own it — via either an active
 * `tenant_domains` row or that other tenant's own `tenants.domain`.
 * `tenant_domains.domain` is UNIQUE at the DB level, so tenant_domains
 * inserts (admin/websites POST) naturally 23505 on a collision — but
 * `tenants.domain` has no unique constraint, so nothing stopped a brand-new
 * tenant from being created with a domain an existing, LIVE tenant already
 * serves. The resolver's own TRANSITION ASSERT-AND-REFUSE divergence guard
 * (tenant.ts / tenant-lookup.ts) throws TENANT_DIVERGENCE /
 * TENANT_DIVERGENCE_AMBIGUOUS on EVERY request to that host the moment this
 * write lands — darkening the EXISTING tenant's live site, not just failing
 * this creation.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/vercel-domains', () => ({
  registerCarryingDomain: vi.fn(async (slug: string) => ({ ok: true, domain: `${slug}.fullloopcrm.com`, status: 'registered' as const })),
}))
vi.mock('@/lib/tenant-lookup', () => ({ invalidateDomainCache: vi.fn() }))

import { POST } from './route'

function seed() {
  return {
    tenants: [
      { id: 'existing-1', slug: 'bravo', name: 'Bravo Co', domain: 'bravo-legacy.com' },
    ] as Record<string, unknown>[],
    tenant_domains: [
      { id: 'td-1', tenant_id: 'existing-1', domain: 'bravo.com', active: true },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: unknown) {
  return POST(new Request('http://t/api/admin/businesses', { method: 'POST', body: JSON.stringify(body) }))
}

function tenantByName(name: string): Record<string, unknown> | undefined {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.name === name)
}

describe('POST /api/admin/businesses — domain collision guard', () => {
  it('CROSS-TENANT PROBE: rejects creating a tenant with a domain already claimed via tenant_domains, and never inserts it', async () => {
    const res = await post({ name: 'NewCo', industry: 'cleaning', domain_name: 'bravo.com' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/bravo\.com is already registered to Bravo Co/)
    expect(tenantByName('NewCo')).toBeUndefined()
  })

  it('rejects creating a tenant with a domain already claimed via the legacy tenants.domain column', async () => {
    const res = await post({ name: 'NewCo2', industry: 'cleaning', domain_name: 'bravo-legacy.com' })
    expect(res.status).toBe(409)
    expect(tenantByName('NewCo2')).toBeUndefined()
  })

  it('a genuinely free domain is accepted and the tenant is created', async () => {
    const res = await post({ name: 'Freshco', industry: 'cleaning', domain_name: 'freshco.com' })
    expect(res.status).toBe(200)
    expect(tenantByName('Freshco')?.domain).toBe('freshco.com')
  })

  it('creating a tenant with no domain at all is never treated as a collision', async () => {
    const res = await post({ name: 'Nodomain', industry: 'cleaning' })
    expect(res.status).toBe(200)
    expect(tenantByName('Nodomain')?.domain).toBeNull()
  })
})
