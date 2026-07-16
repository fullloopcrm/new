import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/tenants/[id] — domain normalization probe.
 *
 * BUG (fixed here): the handler wrote the caller-supplied `domain` straight
 * into `tenants.domain` verbatim — no trim, no lowercase, no www./protocol
 * strip. `tenants.domain` is the resolver's FALLBACK source of truth
 * (getTenantByDomain in tenant-lookup.ts / tenant.ts step 2, used when no
 * active tenant_domains row exists for the host) and its `.eq('domain',
 * cleanDomain)` lookup normalizes the incoming Host header the same way. A
 * row written here in a different form (mixed case, a pasted "https://"
 * prefix, a trailing slash, an un-stripped "www.") would never match that
 * lookup — the admin sees the domain saved, but real traffic to that host
 * falls through to "unresolved". Mirrors the fix already applied to
 * tenant_domains inserts in /api/admin/websites/route.ts.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/security', () => ({ logSecurityEvent: vi.fn(async () => {}) }))

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
})

function put(body: unknown) {
  return PUT(
    new Request('http://t/api/admin/tenants/' + TENANT_A, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: TENANT_A }) },
  )
}

function storedDomain(): unknown {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)?.domain
}

describe('PUT /api/admin/tenants/[id] — domain normalization probe', () => {
  it('NORMALIZATION PROBE: lowercases and strips a pasted protocol/www/trailing-slash so tenants.domain matches how the resolver fallback will look it up', async () => {
    const res = await put({ domain: 'https://WWW.Acme.com/' })
    expect(res.status).toBe(200)
    expect(storedDomain()).toBe('acme.com')
  })

  it('stores a plain lowercase domain unchanged', async () => {
    const res = await put({ domain: 'plainhost.com' })
    expect(res.status).toBe(200)
    expect(storedDomain()).toBe('plainhost.com')
  })

  it('clearing the domain (empty string) stores null, not an unmatchable empty string', async () => {
    const res = await put({ domain: '   https://  ' })
    expect(res.status).toBe(200)
    expect(storedDomain()).toBeNull()
  })

  it('leaves domain untouched when not present in the request body', async () => {
    const res = await put({ name: 'Acme Renamed' })
    expect(res.status).toBe(200)
    expect(storedDomain()).toBeNull()
  })
})
