import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/websites — domain normalization probe.
 *
 * BUG (fixed here): the handler inserted the caller-supplied `domain` into
 * `tenant_domains` verbatim — no trim, no lowercase, no www./protocol strip.
 * Every resolver that reads this table at request time (getTenantByDomain in
 * tenant-lookup.ts / tenant.ts) normalizes the incoming Host header to
 * lowercase + www-stripped before its `.eq('domain', cleanDomain)` lookup,
 * and activate-tenant.ts's own tenant_domains writer applies the identical
 * normalization. A row written here in a different form (mixed case, a
 * pasted "https://" prefix, a trailing slash, an un-stripped "www.") would
 * never match that lookup — the admin sees the domain listed as configured,
 * but real traffic to that host falls through to "unresolved" and gets
 * redirected to sign-in instead of routed to the tenant's site.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { POST } from './route'

function seed() {
  return {
    tenant_domains: [
      { id: 'td-1', tenant_id: TENANT_B, domain: 'existing.com', active: true, is_primary: true },
    ] as Record<string, unknown>[],
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

function insertedDomains(): string[] {
  return (h.seed.tenant_domains as Record<string, unknown>[])
    .filter((r) => r.tenant_id === TENANT_A)
    .map((r) => r.domain as string)
}

describe('POST /api/admin/websites — domain normalization probe', () => {
  it('NORMALIZATION PROBE: lowercases and strips a pasted protocol/www/trailing-slash so the row matches how the resolver will look it up', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'https://WWW.Acme.com/' })
    expect(res.status).toBe(201)
    expect(insertedDomains()).toEqual(['acme.com'])
  })

  it('stores a plain lowercase domain unchanged', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'plainhost.com' })
    expect(res.status).toBe(201)
    expect(insertedDomains()).toEqual(['plainhost.com'])
  })

  it('rejects a domain that normalizes to empty (e.g. "https://" alone)', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: '   https://  ' })
    expect(res.status).toBe(400)
    expect(insertedDomains()).toEqual([])
  })

  it('WRONG-TENANT PROBE: an equivalent-but-differently-cased host already claimed by another tenant still normalizes to the SAME row key, not a silently-coexisting duplicate', async () => {
    // existing.com is already claimed by TENANT_B. Submitting it for TENANT_A
    // in a different case must normalize to the identical key ("existing.com")
    // so the DB's unique(domain) constraint is what decides the conflict —
    // not two case-variant rows silently pointing the same effective host at
    // two different tenants.
    const res = await post({ tenant_id: TENANT_A, domain: 'WWW.Existing.com' })
    // the harness has no unique-constraint enforcement, so the insert itself
    // succeeds here — the point of this probe is the NORMALIZED KEY, which a
    // real Postgres unique(domain) constraint would then correctly collide on.
    expect(res.status).toBe(201)
    expect(insertedDomains()).toEqual(['existing.com'])
  })
})
