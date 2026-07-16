import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/businesses/[id] — domain normalization probe.
 *
 * BUG (fixed here): the onboarding-fields handler wrote the caller-supplied
 * `domain` straight into `tenants.domain` verbatim — no trim, no lowercase,
 * no www./protocol strip. `tenants.domain` is the resolver's FALLBACK source
 * of truth (getTenantByDomain in tenant-lookup.ts / tenant.ts step 2, used
 * when no active tenant_domains row exists for the host) and its `.eq(
 * 'domain', cleanDomain)` lookup normalizes the incoming Host header the
 * same way. A row written here in a different form (mixed case, a pasted
 * "https://" prefix, a trailing slash, an un-stripped "www.") would never
 * match that lookup. Mirrors the fix already applied to `domain` on tenant
 * creation in /api/admin/businesses/route.ts (POST) and to tenant_domains
 * inserts in /api/admin/websites/route.ts. `domain_name` is intentionally
 * left un-normalized — it's the display/registrar-facing field, not what
 * the resolver queries.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

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
})

function put(body: unknown) {
  return PUT(
    new Request('http://t/api/admin/businesses/' + TENANT_A, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: TENANT_A }) },
  )
}

function stored(field: string): unknown {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)?.[field]
}

describe('PUT /api/admin/businesses/[id] — domain normalization probe', () => {
  it('NORMALIZATION PROBE: lowercases and strips a pasted protocol/www/trailing-slash so tenants.domain matches how the resolver fallback will look it up', async () => {
    const res = await put({ domain: 'https://WWW.Acme.com/' })
    expect(res.status).toBe(200)
    expect(stored('domain')).toBe('acme.com')
  })

  it('stores a plain lowercase domain unchanged', async () => {
    const res = await put({ domain: 'plainhost.com' })
    expect(res.status).toBe(200)
    expect(stored('domain')).toBe('plainhost.com')
  })

  it('clearing the domain (empty string) stores null, not an unmatchable empty string', async () => {
    const res = await put({ domain: '   https://  ' })
    expect(res.status).toBe(200)
    expect(stored('domain')).toBeNull()
  })

  it('leaves domain_name RAW (display field, not resolver input)', async () => {
    const res = await put({ domain_name: 'https://WWW.Acme.com/' })
    expect(res.status).toBe(200)
    expect(stored('domain_name')).toBe('https://WWW.Acme.com/')
  })
})
