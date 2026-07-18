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
    maybeSingle: async () => {
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
// getOwnerUserId/verifyImpersonationCookie/verifyTenantHeaderSig are vi.fn()s
// (not static stubs) so the getCurrentTenant() suite below can drive each
// auth path independently, same pattern as tenant-query.test.ts.
const getOwnerUserId = vi.fn<() => Promise<string | null>>()
vi.mock('@/lib/owner-session', () => ({ getOwnerUserId: () => getOwnerUserId() }))
const mockCookieStore = new Map<string, string>()
const mockHeaderStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (mockCookieStore.has(name) ? { value: mockCookieStore.get(name) } : undefined) }),
  headers: async () => ({ get: (name: string) => mockHeaderStore.get(name) ?? null }),
}))
const verifyAdminToken = vi.fn<(token: string) => boolean>()
const verifyTenantAdminToken = vi.fn<(token: string, tenantId: string) => { memberId: string; role: string } | null>()
vi.mock('@/app/api/admin-auth/route', () => ({
  verifyAdminToken: (t: string) => verifyAdminToken(t),
  verifyTenantAdminToken: (t: string, id: string) => verifyTenantAdminToken(t, id),
}))
const verifyImpersonationCookie = vi.fn<(raw: string | undefined) => string | null>()
vi.mock('./impersonation', () => ({ IMPERSONATE_COOKIE: 'imp', verifyImpersonationCookie: (raw: string | undefined) => verifyImpersonationCookie(raw) }))
const verifyTenantHeaderSig = vi.fn<(id: string, sig: string | null) => boolean>()
vi.mock('./tenant-header-sig', () => ({ verifyTenantHeaderSig: (id: string, sig: string | null) => verifyTenantHeaderSig(id, sig) }))

import { getTenantByDomain, getTenantBySlug, getCurrentTenant } from './tenant'

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
  mockCookieStore.clear()
  mockHeaderStore.clear()
  getOwnerUserId.mockReset().mockResolvedValue(null)
  verifyAdminToken.mockReset().mockReturnValue(false)
  verifyTenantAdminToken.mockReset().mockReturnValue(null)
  verifyImpersonationCookie.mockReset().mockReturnValue(null)
  verifyTenantHeaderSig.mockReset().mockReturnValue(false)
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

  it('AMBIGUOUS-LEGACY PROBE: tenant_domains -> A but the legacy tenants.domain lookup errors (2+ rows share the host — tenants.domain has no unique constraint, unlike tenant_domains.domain) refuses rather than silently trusting A', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'ambiguous.com')
        return { data: domainRow({ tenant_id: 't-amb', domain: 'ambiguous.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-amb')
        return { data: tenantRow({ id: 't-amb', slug: 'amb-tenant' }), error: null }
      if (table === 'tenants' && eqs.domain === 'ambiguous.com')
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getTenantByDomain('ambiguous.com')).rejects.toThrow(
      /TENANT_DIVERGENCE_AMBIGUOUS host=ambiguous\.com td=t-amb/,
    )
    errSpy.mockRestore()
  })

  it('TENANT-DOMAINS-QUERY-ERROR PROBE: the primary tenant_domains lookup errors (not just "no row") while a stale legacy tenants.domain row exists for the same host — refuses rather than silently falling through to the legacy tenant', async () => {
    // Mirrors tenant-lookup.ts's fix: the primary query's `error` was
    // previously discarded (only `data` was destructured), so any
    // tenant_domains failure looked identical to "no active row" and fell
    // straight through to the tenants.domain fallback, skipping the
    // divergence guard entirely (it only runs inside `if (domainRow?.tenant_id)`).
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'flaky.com')
        return { data: null, error: { message: 'upstream connect error or disconnect/reset before headers' } }
      if (table === 'tenants' && eqs.domain === 'flaky.com')
        return { data: tenantRow({ id: 't-legacy', slug: 'legacy-tenant' }), error: null }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getTenantByDomain('flaky.com')).rejects.toThrow(
      /TENANT_DOMAINS_LOOKUP_ERROR host=flaky\.com/,
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

  it('TENANT-BY-ID-QUERY-ERROR PROBE: tenant_domains resolves the host, but the subsequent tenant-by-id load errors (genuine DB failure, not dangling/inactive) — refuses loudly instead of silently returning null', async () => {
    // Mirrors tenant-lookup.ts's fix: this sub-query previously discarded its
    // error, so a genuine transient DB failure fetching the tenant row looked
    // identical to "dangling pointer or inactive tenant" and returned null
    // silently instead of throwing.
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'transient-fail.com')
        return { data: domainRow({ tenant_id: 't-flaky', domain: 'transient-fail.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-flaky')
        return { data: null, error: { message: 'upstream connect error or disconnect/reset before headers' } }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getTenantByDomain('transient-fail.com')).rejects.toThrow(
      /TENANT_BY_ID_LOOKUP_ERROR host=transient-fail\.com tenant_id=t-flaky/,
    )
    errSpy.mockRestore()
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

  it('FALLBACK-QUERY-ERROR PROBE: no tenant_domains row, and the legacy tenants.domain fallback query errors (ambiguous 2+ rows or a genuine DB failure) — refuses rather than silently reporting "tenant not found"', async () => {
    // Pure-fallback path: no tenant_domains row exists, nothing to cross-check
    // against. Before this fix the fallback query used single() with its error
    // discarded — indistinguishable from "unknown host", returned null silently.
    resolve = (table, eqs) => {
      if (table === 'tenant_domains') return { data: null, error: null }
      if (table === 'tenants' && eqs.domain === 'flaky-fallback.com')
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getTenantByDomain('flaky-fallback.com')).rejects.toThrow(
      /TENANT_DOMAIN_FALLBACK_LOOKUP_ERROR host=flaky-fallback\.com/,
    )
    errSpy.mockRestore()
  })
})

describe('getTenantBySlug (tenant.ts full-Tenant resolver)', () => {
  it('MALFORMED-INPUT PROBE: a mixed-case caller-supplied slug resolves the same lowercase-stored, active tenant', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.slug === 'acme' && eqs.status === 'active'
        ? { data: tenantRow(), error: null }
        : { data: null, error: null }

    const t = await getTenantBySlug('ACME')
    expect(singleCalls[0].eqs.slug).toBe('acme')
    expect(t?.id).toBe('t-1')
  })

  it('returns null for an unknown slug', async () => {
    resolve = () => ({ data: null, error: null })
    expect(await getTenantBySlug('nobody-slug')).toBeNull()
  })

  it('QUERY-ERROR PROBE: a genuine DB failure on the slug lookup refuses rather than silently reporting "unknown slug"', async () => {
    // slug is UNIQUE NOT NULL, so a real failure can only be a genuine query
    // error, never row-count ambiguity — before this fix it used single() with
    // its error discarded, indistinguishable from a legitimately unknown slug.
    resolve = () => ({ data: null, error: { message: 'upstream connect error or disconnect/reset before headers' } })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getTenantBySlug('flaky-slug')).rejects.toThrow(/TENANT_SLUG_LOOKUP_ERROR slug=flaky-slug/)
    errSpy.mockRestore()
  })
})

describe('getCurrentTenant — real-owner status gate (Clerk membership path)', () => {
  // getCurrentTenant() is what DashboardLayout calls to authorize + render
  // the dashboard. Its Normal-flow branch (real Clerk owner via
  // tenant_members, not admin/impersonation) resolved a tenant by id with NO
  // status check at all — unlike middleware and the ingest routes, which
  // both gate on tenantServesSite. A suspended/cancelled/deleted tenant's
  // owner could still log in on the main host and run the CRM indefinitely.

  function mockMembershipAndTenant(status: string) {
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'user-42')
        return { data: { tenant_id: 't-owner', role: 'owner' }, error: null }
      if (table === 'tenants' && eqs.id === 't-owner')
        return { data: tenantRow({ id: 't-owner', status }), error: null }
      return { data: null, error: null }
    }
  }

  it('positive control: an active tenant\'s real owner is authorized', async () => {
    mockMembershipAndTenant('active')
    const t = await getCurrentTenant()
    expect(t?.id).toBe('t-owner')
  })

  it('a pending tenant\'s real owner is still authorized (only suspended/cancelled/deleted are dark)', async () => {
    mockMembershipAndTenant('pending')
    const t = await getCurrentTenant()
    expect(t?.id).toBe('t-owner')
  })

  it.each(['suspended', 'cancelled', 'deleted'])(
    'WRONG-STATUS PROBE: a %s tenant\'s real owner is refused, not silently authorized',
    async (status) => {
      mockMembershipAndTenant(status)
      const t = await getCurrentTenant()
      expect(t).toBeNull()
    },
  )

  it('ESCAPE HATCH: admin PIN impersonation of a suspended tenant is still authorized (support must still reach dark accounts)', async () => {
    mockCookieStore.set('imp', 'signed-cookie')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue('t-dark')
    verifyAdminToken.mockReturnValue(true)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-dark'
        ? { data: tenantRow({ id: 't-dark', status: 'suspended' }), error: null }
        : { data: null, error: null }

    const t = await getCurrentTenant()
    expect(t?.id).toBe('t-dark')
  })
})

describe('getCurrentTenant — real-owner status gate (signed tenant-domain header path)', () => {
  // dashboard/layout.tsx's own pre-gate accepts the header path on EITHER the
  // global super-admin token OR a per-tenant member token minted for THIS
  // tenant (login at <domain>/fullloop with the member's own PIN). The latter
  // is a REAL (non-impersonated) tenant-owner login — same class as the Clerk
  // membership path above — but getHeaderTenant() had no status check at all,
  // unlike its Clerk-membership sibling. A suspended/cancelled/deleted
  // tenant's own operator could keep rendering (and, via getCurrentTenantId(),
  // driving) the full dashboard through this path indefinitely.

  function mockHeaderTenant(status: string) {
    mockHeaderStore.set('x-tenant-id', 't-dark')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    verifyTenantHeaderSig.mockReturnValue(true)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-dark'
        ? { data: tenantRow({ id: 't-dark', status }), error: null }
        : { data: null, error: null }
  }

  it('positive control: an active tenant\'s own PIN-authenticated operator is authorized', async () => {
    mockCookieStore.set('admin_token', 'tenant-scoped-token')
    verifyTenantAdminToken.mockImplementation((_t, id) => (id === 't-dark' ? { memberId: 'm-1', role: 'manager' } : null))
    mockHeaderTenant('active')

    const t = await getCurrentTenant()
    expect(t?.id).toBe('t-dark')
  })

  it.each(['suspended', 'cancelled', 'deleted'])(
    'WRONG-STATUS PROBE: a %s tenant\'s own PIN-authenticated operator is refused, not silently authorized',
    async (status) => {
      mockCookieStore.set('admin_token', 'tenant-scoped-token')
      verifyTenantAdminToken.mockImplementation((_t, id) => (id === 't-dark' ? { memberId: 'm-1', role: 'manager' } : null))
      mockHeaderTenant(status)

      const t = await getCurrentTenant()
      expect(t).toBeNull()
    },
  )

  it('a pending tenant\'s own PIN-authenticated operator is still authorized (only suspended/cancelled/deleted are dark)', async () => {
    mockCookieStore.set('admin_token', 'tenant-scoped-token')
    verifyTenantAdminToken.mockImplementation((_t, id) => (id === 't-dark' ? { memberId: 'm-1', role: 'manager' } : null))
    mockHeaderTenant('pending')

    const t = await getCurrentTenant()
    expect(t?.id).toBe('t-dark')
  })

  it('ESCAPE HATCH: the global super-admin token reaching a suspended tenant via its own domain is still authorized (support must still reach dark accounts)', async () => {
    mockCookieStore.set('admin_token', 'global-token')
    verifyAdminToken.mockReturnValue(true)
    mockHeaderTenant('suspended')

    const t = await getCurrentTenant()
    expect(t?.id).toBe('t-dark')
  })

  it('a suspended tenant with NO PIN/admin cookie at all is unaffected by this gate (unauthenticated access is refused upstream by dashboard/layout.tsx\'s own pre-check, not here)', async () => {
    mockHeaderTenant('suspended')
    const t = await getCurrentTenant()
    expect(t?.id).toBe('t-dark')
  })
})

describe('getCurrentTenant — masked-error PROBEs (admin PIN impersonation, header tenant, Clerk membership)', () => {
  // getAdminImpersonatedTenant/getHeaderTenant/getCurrentTenant's own
  // membership+tenant lookups all used single() with the error discarded —
  // same pattern already fixed in getTenantByDomain/getTenantBySlug above.
  // A genuine DB failure on any of these used to look identical to "not this
  // auth path" and silently fall through to the NEXT auth branch instead of
  // failing loud.

  it('ADMIN_IMPERSONATION_LOOKUP_ERROR PROBE: a DB failure on the impersonation lookup refuses rather than silently falling through', async () => {
    mockCookieStore.set('imp', 'signed-cookie')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue('t-dark')
    verifyAdminToken.mockReturnValue(true)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-dark'
        ? { data: null, error: { message: 'upstream connect error' } }
        : { data: null, error: null }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getCurrentTenant()).rejects.toThrow(/ADMIN_IMPERSONATION_LOOKUP_ERROR id=t-dark/)
    errSpy.mockRestore()
  })

  it('WRONG-TENANT PROBE: a DB failure on the impersonation lookup does NOT silently fall through and serve the admin their own (different) tenant', async () => {
    // The admin is ALSO a real owner of t-own-tenant. Before this fix, a
    // failure on the impersonation lookup returned null from
    // getAdminImpersonatedTenant, and getCurrentTenant would keep going down
    // the auth chain and authorize the admin's own membership tenant instead
    // -- silently serving the WRONG tenant instead of refusing outright.
    mockCookieStore.set('imp', 'signed-cookie')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue('t-dark')
    verifyAdminToken.mockReturnValue(true)
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) => {
      if (table === 'tenants' && eqs.id === 't-dark')
        return { data: null, error: { message: 'upstream connect error' } }
      if (table === 'tenant_members' && eqs.clerk_user_id === 'user-42')
        return { data: { tenant_id: 't-own-tenant', role: 'owner' }, error: null }
      if (table === 'tenants' && eqs.id === 't-own-tenant')
        return { data: tenantRow({ id: 't-own-tenant', status: 'active' }), error: null }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getCurrentTenant()).rejects.toThrow(/ADMIN_IMPERSONATION_LOOKUP_ERROR id=t-dark/)
    errSpy.mockRestore()
  })

  it('HEADER_TENANT_LOOKUP_ERROR PROBE: a DB failure on the signed-header tenant lookup refuses rather than silently falling through', async () => {
    mockHeaderStore.set('x-tenant-id', 't-host')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    verifyTenantHeaderSig.mockReturnValue(true)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-host'
        ? { data: null, error: { message: 'upstream connect error' } }
        : { data: null, error: null }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getCurrentTenant()).rejects.toThrow(/HEADER_TENANT_LOOKUP_ERROR id=t-host/)
    errSpy.mockRestore()
  })

  it('TENANT_MEMBERSHIP_LOOKUP_ERROR PROBE: a DB failure on the tenant_members lookup refuses rather than silently reporting "no membership"', async () => {
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) =>
      table === 'tenant_members' && eqs.clerk_user_id === 'user-42'
        ? { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }
        : { data: null, error: null }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getCurrentTenant()).rejects.toThrow(/TENANT_MEMBERSHIP_LOOKUP_ERROR clerk_user_id=user-42/)
    errSpy.mockRestore()
  })

  it('TENANT_BY_MEMBERSHIP_LOOKUP_ERROR PROBE: a DB failure resolving the member\'s tenant refuses rather than silently reporting "no tenant"', async () => {
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'user-42')
        return { data: { tenant_id: 't-owner', role: 'owner' }, error: null }
      if (table === 'tenants' && eqs.id === 't-owner')
        return { data: null, error: { message: 'upstream connect error' } }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getCurrentTenant()).rejects.toThrow(/TENANT_BY_MEMBERSHIP_LOOKUP_ERROR tenant_id=t-owner/)
    errSpy.mockRestore()
  })
})
