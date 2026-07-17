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

/**
 * POST /api/admin/websites — single-active-primary invariant probe.
 *
 * BUG (fixed here): setting `is_primary: true` on a NEW domain never demoted
 * the tenant's existing primary, so two active is_primary=true rows could
 * coexist for one tenant. Every "primary domain" resolver
 * (getPrimaryTenantDomain in domains.ts — which feeds tenantSiteUrl(),
 * tenantBrand(), the SELENA agent's brand override, and resolveOrigin(); plus
 * referrers/[code], site-export, cron/tenant-health) picks whichever row an
 * unordered query happens to return first, so a second live primary makes
 * which domain "wins" for invoice/quote/document send links and SMS branding
 * non-deterministic instead of just wrong.
 */
describe('POST /api/admin/websites — single-active-primary invariant probe', () => {
  function seedWithExistingPrimaries() {
    return {
      tenant_domains: [
        { id: 'td-a-old', tenant_id: TENANT_A, domain: 'old-primary-a.com', active: true, is_primary: true },
        { id: 'td-b-primary', tenant_id: TENANT_B, domain: 'existing.com', active: true, is_primary: true },
      ] as Record<string, unknown>[],
    }
  }

  let h2: Harness
  beforeEach(() => {
    h2 = createTenantDbHarness(seedWithExistingPrimaries())
    holder.from = h2.from
  })

  function rowsFor(tenantId: string) {
    return (h2.seed.tenant_domains as Record<string, unknown>[]).filter((r) => r.tenant_id === tenantId)
  }

  it('DEMOTE-BEFORE-INSERT PROBE: marking a new domain primary demotes the tenant\'s existing primary instead of letting two coexist', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'new-primary-a.com', is_primary: true })
    expect(res.status).toBe(201)

    const a = rowsFor(TENANT_A)
    const primaries = a.filter((r) => r.is_primary === true)
    expect(primaries).toHaveLength(1)
    expect(primaries[0].domain).toBe('new-primary-a.com')
    expect(a.find((r) => r.domain === 'old-primary-a.com')?.is_primary).toBe(false)
  })

  it('WRONG-TENANT PROBE: demoting the caller\'s tenant never touches another tenant\'s primary row', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'new-primary-a.com', is_primary: true })
    expect(res.status).toBe(201)

    const b = rowsFor(TENANT_B)
    expect(b.find((r) => r.domain === 'existing.com')?.is_primary).toBe(true)
  })

  it('adding a NON-primary domain does not touch the existing primary', async () => {
    const res = await post({ tenant_id: TENANT_A, domain: 'alias-a.com', is_primary: false })
    expect(res.status).toBe(201)

    const a = rowsFor(TENANT_A)
    expect(a.find((r) => r.domain === 'old-primary-a.com')?.is_primary).toBe(true)
    expect(a.find((r) => r.domain === 'alias-a.com')?.is_primary).toBe(false)
  })
})
