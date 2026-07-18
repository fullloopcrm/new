import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/tenants/[id] — domain collision guard.
 *
 * BUG (fixed here): same class as admin/businesses/[id]'s identical PUT —
 * this handler wrote the caller-supplied `domain` straight into
 * `tenants.domain` with no check that another tenant doesn't already own it
 * via either an active `tenant_domains` row or that OTHER tenant's own
 * `tenants.domain`. `tenants.domain` has no DB unique constraint, so nothing
 * stopped a collision, and the resolver's TRANSITION ASSERT-AND-REFUSE
 * divergence guard (tenant.ts / tenant-lookup.ts) throws on EVERY request to
 * that host the moment one lands — darkening the OTHER, already-live
 * tenant's site.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/security', () => ({ logSecurityEvent: vi.fn(async () => {}) }))

import { PUT } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, slug: 'acme', name: 'Acme', domain: null, status: 'active' },
      { id: TENANT_B, slug: 'bravo', name: 'Bravo Co', domain: 'bravo-legacy.com', status: 'active' },
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
    new Request('http://t/api/admin/tenants/' + id, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) },
  )
}

function storedDomain(id: string): unknown {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === id)?.domain
}

describe('PUT /api/admin/tenants/[id] — domain collision guard', () => {
  it('WRONG-TENANT PROBE: rejects a domain already claimed by ANOTHER tenant via tenant_domains, and never writes it', async () => {
    const res = await put(TENANT_A, { domain: 'bravo.com' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/bravo\.com is already registered to Bravo Co/)
    expect(storedDomain(TENANT_A)).toBeNull()
  })

  it('rejects a domain already claimed by ANOTHER tenant via the legacy tenants.domain column', async () => {
    const res = await put(TENANT_A, { domain: 'bravo-legacy.com' })
    expect(res.status).toBe(409)
    expect(storedDomain(TENANT_A)).toBeNull()
  })

  it('SELF-EXCLUSION PROBE: re-saving the SAME domain already registered to THIS tenant is not a collision', async () => {
    const res = await put(TENANT_B, { name: 'Bravo Co Renamed', domain: 'bravo.com' })
    expect(res.status).toBe(200)
    expect(storedDomain(TENANT_B)).toBe('bravo.com')
  })

  it('a genuinely free domain is accepted and written', async () => {
    const res = await put(TENANT_A, { domain: 'freshdomain.com' })
    expect(res.status).toBe(200)
    expect(storedDomain(TENANT_A)).toBe('freshdomain.com')
  })
})
