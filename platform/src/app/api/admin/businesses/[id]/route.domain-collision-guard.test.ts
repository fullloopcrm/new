import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/businesses/[id] — domain collision guard.
 *
 * BUG (fixed here): this handler wrote the caller-supplied `domain` straight
 * into `tenants.domain` with no check that another tenant doesn't already own
 * it — via either an active `tenant_domains` row or that OTHER tenant's own
 * `tenants.domain`. `tenant_domains.domain` is UNIQUE at the DB level, so its
 * own write site (admin/websites POST) naturally 23505s on a collision, but
 * `tenants.domain` has NO unique constraint — nothing stopped this write. The
 * moment two tenants' domain columns collided (or this tenant's domain
 * collided with another tenant's tenant_domains row), the resolver's own
 * TRANSITION ASSERT-AND-REFUSE divergence guard (tenant.ts / tenant-lookup.ts)
 * throws TENANT_DIVERGENCE / TENANT_DIVERGENCE_AMBIGUOUS on EVERY request to
 * that host — darkening the OTHER, already-live tenant's site, not just
 * rejecting this write.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { PUT } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, slug: 'acme', name: 'Acme', domain: null, domain_name: null, admin_seats: 1, team_seats: 0 },
      { id: TENANT_B, slug: 'bravo', name: 'Bravo Co', domain: 'bravo-legacy.com', domain_name: null, admin_seats: 1, team_seats: 0 },
    ] as Record<string, unknown>[],
    tenant_domains: [
      { id: 'td-1', tenant_id: TENANT_B, domain: 'bravo.com', active: true },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function put(id: string, body: unknown) {
  return PUT(
    new Request('http://t/api/admin/businesses/' + id, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) },
  )
}

function stored(id: string, field: string): unknown {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === id)?.[field]
}

describe('PUT /api/admin/businesses/[id] — domain collision guard', () => {
  it('WRONG-TENANT PROBE: rejects a domain already claimed by ANOTHER tenant via tenant_domains, and never writes it', async () => {
    const res = await put(TENANT_A, { domain: 'bravo.com' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/bravo\.com is already registered to Bravo Co/)
    expect(stored(TENANT_A, 'domain')).toBeNull()
  })

  it('rejects a domain already claimed by ANOTHER tenant via the legacy tenants.domain column', async () => {
    const res = await put(TENANT_A, { domain: 'bravo-legacy.com' })
    expect(res.status).toBe(409)
    expect(stored(TENANT_A, 'domain')).toBeNull()
  })

  it('SELF-EXCLUSION PROBE: re-saving the SAME domain already registered to THIS tenant is not a collision', async () => {
    const res = await put(TENANT_B, { name: 'Bravo Co Renamed', domain: 'bravo.com' })
    expect(res.status).toBe(200)
    expect(stored(TENANT_B, 'domain')).toBe('bravo.com')
  })

  it('a genuinely free domain is accepted and written', async () => {
    const res = await put(TENANT_A, { domain: 'freshdomain.com' })
    expect(res.status).toBe(200)
    expect(stored(TENANT_A, 'domain')).toBe('freshdomain.com')
  })

  it('clearing the domain (no value) is never treated as a collision', async () => {
    const res = await put(TENANT_A, { domain: '' })
    expect(res.status).toBe(200)
    expect(stored(TENANT_A, 'domain')).toBeNull()
  })
})
