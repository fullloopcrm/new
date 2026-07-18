import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Domain resolver tests — this is the code behind the tenant brand-swap
 * incident: getTenantByDomain must (1) strip www, (2) honor tenants.domain
 * BEFORE tenant_domains, (3) fall back to tenant_domains, (4) cache results.
 *
 * We mock the Supabase client with a small query builder whose .single()
 * result is decided by a per-test resolver keyed on (table, eq-filters).
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

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

import { getTenantByDomain, getTenantBySlug } from './tenant-lookup'

const tenantRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't-1',
  slug: 'acme',
  name: 'Acme',
  domain: 'acme.com',
  status: 'active',
  ...over,
})

beforeEach(() => {
  singleCalls = []
  resolve = () => ({ data: null, error: null })
})

describe('getTenantByDomain', () => {
  it('strips the www. prefix before looking up', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.domain === 'acme.com'
        ? { data: tenantRow(), error: null }
        : { data: null, error: null }

    const t = await getTenantByDomain('www.acme-strip.com'.replace('acme-strip', 'acme'))
    // the domain queried must be the www-stripped form
    expect(singleCalls[0].eqs.domain).toBe('acme.com')
    expect(t?.slug).toBe('acme')
  })

  it('resolves via tenants.domain and does NOT fall through to tenant_domains', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.domain === 'primary1.com'
        ? { data: tenantRow({ domain: 'primary1.com', slug: 'primary1' }), error: null }
        : { data: null, error: null }

    const t = await getTenantByDomain('primary1.com')
    expect(t?.slug).toBe('primary1')
    // tenant_domains must never be queried when tenants.domain already matched
    expect(singleCalls.some((c) => c.table === 'tenant_domains')).toBe(false)
  })

  it('falls back to tenant_domains when tenants.domain has no match', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenants' && eqs.domain === 'alias2.com') return { data: null, error: null }
      if (table === 'tenant_domains' && eqs.domain === 'alias2.com')
        return { data: { tenant_id: 't-2' }, error: null }
      if (table === 'tenants' && eqs.id === 't-2')
        return { data: tenantRow({ id: 't-2', slug: 'via-alias' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('alias2.com')
    expect(t?.slug).toBe('via-alias')
    expect(singleCalls.some((c) => c.table === 'tenant_domains')).toBe(true)
  })

  it('only considers active rows in the tenant_domains fallback', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'active3.com') {
        expect(eqs.active).toBe(true) // resolver must filter active=true
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }
    await getTenantByDomain('active3.com')
    expect(singleCalls.some((c) => c.table === 'tenant_domains' && c.eqs.active === true)).toBe(true)
  })

  it('returns null when neither table matches', async () => {
    resolve = () => ({ data: null, error: null })
    expect(await getTenantByDomain('nobody4.com')).toBeNull()
  })

  it('caches a resolved tenant — a second lookup does not re-query', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.domain === 'cached5.com'
        ? { data: tenantRow({ slug: 'cached5', domain: 'cached5.com' }), error: null }
        : { data: null, error: null }

    const first = await getTenantByDomain('cached5.com')
    const callsAfterFirst = singleCalls.length
    const second = await getTenantByDomain('cached5.com')

    expect(second?.slug).toBe('cached5')
    expect(second).toEqual(first)
    expect(singleCalls.length).toBe(callsAfterFirst) // no new DB calls on the cache hit
  })

  /**
   * Every real slug/domain is stored lowercase, but not every caller
   * normalizes case before calling in: middleware's cleanHost already
   * lowercases, but a mixed-case Host header reaching getTenantByDomain any
   * other way (or a future caller) must still resolve. Lowercasing INSIDE
   * the function — not trusting each call site — is what closes this.
   */
  it('lowercases before stripping www — a case-varied www prefix does not survive into the query key', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.domain === 'caseinsensitive6.com'
        ? { data: tenantRow({ slug: 'caseinsensitive6', domain: 'caseinsensitive6.com' }), error: null }
        : { data: null, error: null }

    const t = await getTenantByDomain('WWW.CaseInsensitive6.COM')
    expect(singleCalls[0].eqs.domain).toBe('caseinsensitive6.com')
    expect(t?.slug).toBe('caseinsensitive6')
  })

  it('shares a cache entry between differently-cased Host values for the same domain', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.domain === 'caseshare7.com'
        ? { data: tenantRow({ slug: 'caseshare7', domain: 'caseshare7.com' }), error: null }
        : { data: null, error: null }

    await getTenantByDomain('caseshare7.com')
    const callsAfterFirst = singleCalls.length
    const second = await getTenantByDomain('CASESHARE7.COM')

    expect(second?.slug).toBe('caseshare7')
    expect(singleCalls.length).toBe(callsAfterFirst) // no new DB call — same cache key
  })
})

describe('getTenantBySlug', () => {
  /**
   * The external /api/ingest/lead and /api/ingest/application routes pass a
   * partner-supplied `tenant_slug` body field straight through with only
   * `.trim()` — no case normalization. A case-sensitive `.eq('slug', slug)`
   * against a mixed-case value silently misses the real, lowercase-stored
   * row (and negatively caches the miss), so a partner sending "NycMaid"
   * instead of "nycmaid" would silently drop every lead. Lowercasing here
   * fixes it for every caller, present and future.
   */
  it('lowercases the slug before querying', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.slug === 'nycmaid'
        ? { data: tenantRow({ slug: 'nycmaid', domain: 'nycmaid.com' }), error: null }
        : { data: null, error: null }

    const t = await getTenantBySlug('NycMaid')
    expect(singleCalls[0].eqs.slug).toBe('nycmaid')
    expect(t?.slug).toBe('nycmaid')
  })

  it('shares a cache entry between differently-cased slug values', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.slug === 'sharedslug'
        ? { data: tenantRow({ slug: 'sharedslug', domain: 'sharedslug.com' }), error: null }
        : { data: null, error: null }

    await getTenantBySlug('sharedslug')
    const callsAfterFirst = singleCalls.length
    const second = await getTenantBySlug('SharedSlug')

    expect(second?.slug).toBe('sharedslug')
    expect(singleCalls.length).toBe(callsAfterFirst) // no new DB call — same cache key
  })

  it('returns null when no row matches, case-insensitively', async () => {
    resolve = () => ({ data: null, error: null })
    expect(await getTenantBySlug('NoSuchSlug')).toBeNull()
  })
})
