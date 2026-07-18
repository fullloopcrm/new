import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/referrers/[code] — share_url primary-domain resolution.
 *
 * BUG (fixed here): this route queried tenant_domains directly and picked a
 * primary via an UNORDERED `.find(d => d.is_primary)` over an unordered
 * select — the exact non-deterministic-primary bug domains.ts's
 * getPrimaryTenantDomain() was hardened against (see domains.test.ts's own
 * MULTI-PRIMARY DETERMINISM PROBE, which covers the created_at-ascending sort
 * itself). This route now delegates to tenantSiteUrl() -> getPrimaryTenantDomain()
 * like every other site-URL call site, instead of re-deriving its own pick.
 *
 * The MULTI-PRIMARY case below seeds tenant_domains rows PRE-SORTED oldest-
 * first — the shape getPrimaryTenantDomain's own `.order('created_at', {
 * ascending: true })` produces against a real DB — and asserts this route
 * surfaces that pick unchanged, rather than re-deriving a possibly-different
 * one from a second, independently-ordered read.
 */

type Resolution = { data: unknown; error: unknown }

let resolveReferrers: () => Resolution
let resolveTenants: () => Resolution
let resolveTenantDomains: () => Resolution

function builder(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      if (table === 'referrers') return resolveReferrers()
      if (table === 'tenants') return resolveTenants()
      throw new Error(`unexpected maybeSingle table ${table}`)
    },
    then: (onFulfilled: (v: unknown) => unknown) => {
      if (table === 'tenant_domains') return Promise.resolve(resolveTenantDomains()).then(onFulfilled)
      // referral_commissions and anything else just resolves to no rows
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const getReferrerAuth = vi.fn<() => { rid: string; tid: string } | null>()
vi.mock('@/lib/referrer-portal-auth', () => ({ getReferrerAuth: () => getReferrerAuth() }))

import { GET } from './route'

const REFERRER_ROW = {
  id: 'ref-1',
  tenant_id: 'tenant-1',
  name: 'Pat',
  email: 'pat@example.com',
  referral_code: 'PATT123',
  commission_rate: 0.1,
  total_earned: 5000,
  total_paid: 2000,
}

function get(code: string) {
  const req = new Request(`http://t/api/referrers/${code}`, {
    headers: { authorization: 'Bearer good-token' },
  })
  return GET(req, { params: Promise.resolve({ code }) })
}

beforeEach(() => {
  getReferrerAuth.mockReset().mockReturnValue({ rid: 'ref-1', tid: 'tenant-1' })
  resolveReferrers = () => ({ data: REFERRER_ROW, error: null })
  resolveTenants = () => ({
    data: { name: 'Acme Cleaning', slug: 'acme', domain: null, primary_color: '#0d9488', email: null, owner_email: null },
    error: null,
  })
  resolveTenantDomains = () => ({ data: [], error: null })
})

describe('GET /api/referrers/[code] — share_url primary-domain resolution', () => {
  it('MULTI-PRIMARY PROBE: surfaces the OLDER pre-sorted is_primary row, not a re-derived pick', async () => {
    resolveTenantDomains = () => ({
      data: [
        { domain: 'older-primary.acme.com', is_primary: true, created_at: '2026-01-01T00:00:00Z' },
        { domain: 'newer-primary.acme.com', is_primary: true, created_at: '2026-06-01T00:00:00Z' },
      ],
      error: null,
    })

    const res = await get('PATT123')
    const body = await res.json()

    expect(body.share_url).toBe('https://older-primary.acme.com/book/new?ref=PATT123')
  })

  it('uses the single is_primary domain when only one exists', async () => {
    resolveTenantDomains = () => ({
      data: [{ domain: 'acme.com', is_primary: true, created_at: '2026-01-01T00:00:00Z' }],
      error: null,
    })

    const res = await get('PATT123')
    const body = await res.json()

    expect(body.share_url).toBe('https://acme.com/book/new?ref=PATT123')
  })

  it('falls back to tenants.domain when no tenant_domains row exists', async () => {
    resolveTenants = () => ({
      data: { name: 'Acme Cleaning', slug: 'acme', domain: 'legacy-acme.com', primary_color: '#0d9488', email: null, owner_email: null },
      error: null,
    })

    const res = await get('PATT123')
    const body = await res.json()

    expect(body.share_url).toBe('https://legacy-acme.com/book/new?ref=PATT123')
  })

  it('falls back to the slug host when neither tenant_domains nor tenants.domain has anything', async () => {
    const res = await get('PATT123')
    const body = await res.json()

    expect(body.share_url).toBe('https://acme.homeservicesbusinesscrm.com/book/new?ref=PATT123')
  })
})
