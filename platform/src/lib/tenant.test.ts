import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getTenantByDomain (src/lib/tenant.ts) — the FULL-Tenant / supabaseAdmin domain
 * resolver, reconciled in P1 (2026-07-11) to the SAME contract as the middleware
 * resolver in ./tenant-lookup.ts so both agree on which tenant a host maps to:
 *
 *   1. tenant_domains FIRST (host -> tenant_id)
 *   2. tenants.domain FALLBACK (only when no active tenant_domains row)
 *   + TRANSITION assert-and-refuse guard on divergence (throws, greppable log)
 *   + dangling / inactive tenant_domains pointer -> null (never falls through)
 *
 * This resolver keeps tenant.ts's own contract: it returns the full row and only
 * resolves ACTIVE tenants (id/domain loads filter status='active'); the legacy
 * divergence cross-check is status-agnostic (mirrors tenant-lookup).
 *
 * Supabase is mocked with a small query builder whose .single() result is
 * decided by a per-test resolver keyed on (table, eq-filters). tenant.ts's other
 * top-level imports are stubbed so importing the module in isolation is clean.
 */

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let singleCalls: Array<{ table: string; eqs: Eqs }>

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => {
      singleCalls.push({ table, eqs })
      return resolve(table, eqs)
    },
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
  supabase: { from: (table: string) => builder(table) },
}))

// Stub tenant.ts's other top-level imports — unused by getTenantByDomain, mocked
// only so importing the module doesn't drag in Next server internals.
vi.mock('@/lib/owner-session', () => ({ getOwnerUserId: async () => null }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }))
vi.mock('@/app/api/admin-auth/route', () => ({ verifyAdminToken: () => false }))
vi.mock('./impersonation', () => ({ IMPERSONATE_COOKIE: 'imp', verifyImpersonationCookie: () => null }))
vi.mock('./tenant-header-sig', () => ({ verifyTenantHeaderSig: () => false }))

import { getTenantByDomain } from './tenant'

// Full-ish tenant row (only the fields these tests assert on matter).
const tenantRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't-1',
  slug: 'acme',
  name: 'Acme',
  domain: 'acme.com',
  status: 'active',
  ...over,
})

const domainRow = (over: Partial<Record<string, unknown>> = {}) => ({
  tenant_id: 't-1',
  domain: 'acme.com',
  active: true,
  routing_mode: 'template',
  vercel_project: 'platform',
  status: 'active',
  ...over,
})

beforeEach(() => {
  singleCalls = []
  resolve = () => ({ data: null, error: null })
})

describe('getTenantByDomain (tenant.ts full-Tenant resolver)', () => {
  it('strips the www. prefix before looking up', async () => {
    resolve = (table, eqs) =>
      table === 'tenant_domains' && eqs.domain === 'acme.com'
        ? { data: domainRow(), error: null }
        : table === 'tenants' && eqs.id === 't-1'
          ? { data: tenantRow(), error: null }
          : { data: null, error: null }

    const t = await getTenantByDomain('www.acme.com')
    expect(singleCalls[0].table).toBe('tenant_domains')
    expect(singleCalls[0].eqs.domain).toBe('acme.com')
    expect(t?.slug).toBe('acme')
  })

  it('resolves via tenant_domains FIRST (not any tenants.domain fallback)', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'primary1.com')
        return { data: domainRow({ tenant_id: 't-9', domain: 'primary1.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-9')
        return { data: tenantRow({ id: 't-9', slug: 'primary1', domain: 'primary1.com' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('primary1.com')
    expect(t?.id).toBe('t-9')
    expect(t?.slug).toBe('primary1')
  })

  it('primary tenant_domains load filters status=active (only serves active tenants)', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'active-only.com')
        return { data: domainRow({ tenant_id: 't-a', domain: 'active-only.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-a')
        return { data: tenantRow({ id: 't-a', slug: 'active-only' }), error: null }
      return { data: null, error: null }
    }

    await getTenantByDomain('active-only.com')
    const idLoad = singleCalls.find((c) => c.table === 'tenants' && c.eqs.id === 't-a')
    expect(idLoad?.eqs.status).toBe('active')
  })

  it('falls back to tenants.domain when no tenant_domains row exists', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains') return { data: null, error: null }
      if (table === 'tenants' && eqs.domain === 'legacy3.com')
        return { data: tenantRow({ id: 't-3', slug: 'legacy3', domain: 'legacy3.com' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('legacy3.com')
    expect(t?.slug).toBe('legacy3')
    expect(singleCalls.some((c) => c.table === 'tenant_domains')).toBe(true)
    // fallback load is active-filtered too
    const domLoad = singleCalls.find((c) => c.table === 'tenants' && c.eqs.domain === 'legacy3.com')
    expect(domLoad?.eqs.status).toBe('active')
  })

  it('DIVERGENCE REFUSAL: tenant_domains -> A but legacy tenants.domain -> B refuses (throws, serves nothing)', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'swap.com')
        return { data: domainRow({ tenant_id: 't-correct', domain: 'swap.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-correct')
        return { data: tenantRow({ id: 't-correct', slug: 'correct-tenant' }), error: null }
      // stale legacy row points same host at a DIFFERENT tenant
      if (table === 'tenants' && eqs.domain === 'swap.com')
        return { data: { id: 't-wrong' }, error: null }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getTenantByDomain('swap.com')).rejects.toThrow(
      'TENANT_DIVERGENCE host=swap.com td=t-correct legacy=t-wrong',
    )
    expect(errSpy).toHaveBeenCalledWith(
      'TENANT_DIVERGENCE host=swap.com td=t-correct legacy=t-wrong',
    )
    errSpy.mockRestore()
  })

  it('AGREEMENT: tenant_domains -> A and legacy tenants.domain -> same A proceeds normally', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'agree.com')
        return { data: domainRow({ tenant_id: 't-same', domain: 'agree.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-same')
        return { data: tenantRow({ id: 't-same', slug: 'agree-tenant' }), error: null }
      if (table === 'tenants' && eqs.domain === 'agree.com')
        return { data: { id: 't-same' }, error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('agree.com')
    expect(t?.id).toBe('t-same')
    expect(t?.slug).toBe('agree-tenant')
  })

  it('WRONG-TENANT PROBE: a dangling/inactive tenant_domains pointer resolves to null, not the fallback tenant', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'dangling.com')
        return { data: domainRow({ tenant_id: 't-gone', domain: 'dangling.com' }), error: null }
      // t-gone does not resolve as an active tenant
      if (table === 'tenants' && eqs.id === 't-gone') return { data: null, error: null }
      // a stale tenants.domain row that WOULD swap in a different tenant
      if (table === 'tenants' && eqs.domain === 'dangling.com')
        return { data: tenantRow({ id: 't-other', slug: 'other' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('dangling.com')
    expect(t).toBeNull()
    // must NOT have fallen through to the tenants.domain fallback tenant
    expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.domain === 'dangling.com')).toBe(false)
  })

  it('only considers active rows in the tenant_domains lookup', async () => {
    resolve = () => ({ data: null, error: null })
    await getTenantByDomain('active4.com')
    expect(singleCalls.some((c) => c.table === 'tenant_domains' && c.eqs.active === true)).toBe(true)
  })

  it('returns null when neither table matches', async () => {
    resolve = () => ({ data: null, error: null })
    expect(await getTenantByDomain('nobody5.com')).toBeNull()
  })

  it('MALFORMED-INPUT PROBE: a mixed-case host (e.g. "WWW.Acme.com") resolves the same as the lowercase host', async () => {
    resolve = (table, eqs) =>
      table === 'tenant_domains' && eqs.domain === 'acme.com'
        ? { data: domainRow(), error: null }
        : table === 'tenants' && eqs.id === 't-1'
          ? { data: tenantRow(), error: null }
          : { data: null, error: null }

    const t = await getTenantByDomain('WWW.Acme.com')
    expect(singleCalls[0].eqs.domain).toBe('acme.com')
    expect(t?.slug).toBe('acme')
  })
})
