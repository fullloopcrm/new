import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Domain resolver tests — the code behind the tenant brand-swap incident.
 *
 * P1 (2026-07-11) REVERSED the resolution order: getTenantByDomain now reads
 * tenant_domains FIRST (host -> tenant_id) and only falls back to tenants.domain
 * when no active tenant_domains row exists. This is the opposite of the pre-P1
 * ordering that an earlier version of this file asserted; the anti-cross-tenant
 * -leak INTENT is preserved — the primary source (tenant_domains) is
 * authoritative and a stale fallback must never swap in a different tenant.
 *
 * getTenantByDomain must: (1) strip www, (2) resolve via tenant_domains BEFORE
 * tenants.domain, (3) fall back to tenants.domain when no domain row, (4) never
 * resolve a host to the wrong tenant, (5) surface the P1 routing columns, (6)
 * cache results.
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
    maybeSingle: async () => {
      singleCalls.push({ table, eqs })
      return resolve(table, eqs)
    },
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

import { getTenantByDomain, getTenantBySlug, invalidateTenantCache, invalidateDomainCache, invalidateSlugCache } from './tenant-lookup'

const tenantRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't-1',
  slug: 'acme',
  name: 'Acme',
  domain: 'acme.com',
  status: 'active',
  ...over,
})

// A tenant_domains row as it looks AFTER W1's migration lands — includes the
// new P1 columns. Mocked here; the migration is not in the DB yet.
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

describe('getTenantByDomain', () => {
  it('strips the www. prefix before looking up', async () => {
    resolve = (table, eqs) =>
      table === 'tenant_domains' && eqs.domain === 'acme.com'
        ? { data: domainRow(), error: null }
        : table === 'tenants' && eqs.id === 't-1'
          ? { data: tenantRow(), error: null }
          : { data: null, error: null }

    const t = await getTenantByDomain('www.acme.com')
    // the first query (tenant_domains) must use the www-stripped host
    expect(singleCalls[0].table).toBe('tenant_domains')
    expect(singleCalls[0].eqs.domain).toBe('acme.com')
    expect(t?.slug).toBe('acme')
  })

  it('resolves via tenant_domains FIRST and does NOT adopt the tenants.domain fallback tenant', async () => {
    // No legacy tenants.domain row for this host → the transition cross-check
    // finds nothing to diverge against, so the tenant_domains result stands.
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'primary1.com')
        return { data: domainRow({ tenant_id: 't-9', domain: 'primary1.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-9')
        return { data: tenantRow({ id: 't-9', slug: 'primary1', domain: 'primary1.com' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('primary1.com')
    // resolved to the tenant_domains tenant, not any fallback tenant
    expect(t?.id).toBe('t-9')
    expect(t?.slug).toBe('primary1')
  })

  it('surfaces the P1 routing columns from the matched tenant_domains row', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'bespoke2.com')
        return {
          data: domainRow({
            tenant_id: 't-b',
            domain: 'bespoke2.com',
            routing_mode: 'bespoke',
            vercel_project: 'bespoke-site',
            status: 'pending',
          }),
          error: null,
        }
      if (table === 'tenants' && eqs.id === 't-b')
        return { data: tenantRow({ id: 't-b', slug: 'bespoke2' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('bespoke2.com')
    expect(t?.routingMode).toBe('bespoke')
    expect(t?.vercelProject).toBe('bespoke-site')
    expect(t?.domainStatus).toBe('pending')
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
    // proves the fallback path ran: tenant_domains was tried, then tenants BY DOMAIN
    expect(singleCalls.some((c) => c.table === 'tenant_domains')).toBe(true)
    expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.domain === 'legacy3.com')).toBe(true)
    // fallback path carries no routing metadata
    expect(t?.routingMode).toBeUndefined()
  })

  it('DIVERGENCE REFUSAL: tenant_domains -> A but legacy tenants.domain -> B refuses (throws, serves nothing)', async () => {
    // Same host is claimed by tenant_domains -> t-correct AND by a stale
    // tenants.domain row -> t-wrong. During the transition the resolver must NOT
    // silently pick either — it must refuse loudly so neither tenant is served
    // under the other's brand (the brand-swap failure mode).
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'swap.com')
        return { data: domainRow({ tenant_id: 't-correct', domain: 'swap.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-correct')
        return { data: tenantRow({ id: 't-correct', slug: 'correct-tenant' }), error: null }
      // a stale tenants.domain row that points the same host at a DIFFERENT tenant
      if (table === 'tenants' && eqs.domain === 'swap.com')
        return { data: tenantRow({ id: 't-wrong', slug: 'wrong-tenant' }), error: null }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getTenantByDomain('swap.com')).rejects.toThrow(
      'TENANT_DIVERGENCE host=swap.com td=t-correct legacy=t-wrong',
    )
    // the greppable divergence line was logged
    expect(errSpy).toHaveBeenCalledWith(
      'TENANT_DIVERGENCE host=swap.com td=t-correct legacy=t-wrong',
    )
    errSpy.mockRestore()
  })

  it('AMBIGUOUS-LEGACY PROBE: tenant_domains -> A but the legacy tenants.domain lookup errors (2+ rows share the host — no unique constraint on tenants.domain) refuses rather than silently trusting A', async () => {
    // tenants.domain has no DB-level unique constraint (unlike tenant_domains.domain),
    // so two legacy rows CAN share a host. That must refuse loudly, not be treated
    // as "no legacy row" (which would silently skip the divergence cross-check on
    // exactly the input — an inconsistent legacy table — it exists to catch).
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
    // The primary query's `error` was previously discarded (only `data` was
    // destructured), so ANY tenant_domains failure — not just the expected
    // "0 rows, no active row for this host" case — looked identical to "no
    // tenant_domains row" and fell straight through to the tenants.domain
    // fallback, completely skipping the divergence guard below (it only runs
    // inside `if (domainRow?.tenant_id)`). That serves whatever legacy has for
    // the host with zero cross-check — the exact brand-swap failure mode the
    // guard exists to catch, just reached via a different door.
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
    // Both sources point the host at the same tenant → no divergence → the
    // tenant_domains-first result is served.
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'agree.com')
        return { data: domainRow({ tenant_id: 't-same', domain: 'agree.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-same')
        return { data: tenantRow({ id: 't-same', slug: 'agree-tenant' }), error: null }
      // legacy row agrees: same tenant id
      if (table === 'tenants' && eqs.domain === 'agree.com')
        return { data: tenantRow({ id: 't-same', slug: 'agree-tenant' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('agree.com')
    expect(t?.id).toBe('t-same')
    expect(t?.slug).toBe('agree-tenant')
  })

  it('WRONG-TENANT PROBE: a dangling tenant_domains pointer resolves to null, not the fallback tenant', async () => {
    // tenant_domains claims the host for t-gone, but that tenant no longer
    // exists. Falling through to tenants.domain would swap in t-other — forbidden.
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'dangling.com')
        return { data: domainRow({ tenant_id: 't-gone', domain: 'dangling.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-gone') return { data: null, error: null }
      if (table === 'tenants' && eqs.domain === 'dangling.com')
        return { data: tenantRow({ id: 't-other', slug: 'other' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('dangling.com')
    expect(t).toBeNull()
    // must not have leaked to the fallback tenant
    expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.domain === 'dangling.com')).toBe(false)
  })

  it('TENANT-BY-ID-QUERY-ERROR PROBE: tenant_domains resolves the host, but the subsequent tenant-by-id load errors (genuine DB failure, not a truly dangling pointer) — refuses loudly rather than silently caching a false-negative', async () => {
    // Before this fix, this sub-query discarded its error and treated any
    // failure identically to "tenant_id no longer resolves" (a genuinely
    // dangling pointer) — silently caching null for the full 5-minute TTL.
    // A single transient DB blip would take a live custom domain offline for
    // up to 5 minutes, since every request in that window hit the cached
    // negative result instead of retrying.
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

    // the failure must NOT have been cached — a retry should hit the DB again,
    // not silently return the same (would-be) negative result
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'transient-fail.com')
        return { data: domainRow({ tenant_id: 't-flaky', domain: 'transient-fail.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-flaky')
        return { data: tenantRow({ id: 't-flaky', slug: 'recovered' }), error: null }
      return { data: null, error: null }
    }
    const t = await getTenantByDomain('transient-fail.com')
    expect(t?.slug).toBe('recovered')
  })

  it('only considers active rows in the tenant_domains lookup', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'active4.com') {
        expect(eqs.active).toBe(true) // resolver must filter active=true
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }
    await getTenantByDomain('active4.com')
    expect(singleCalls.some((c) => c.table === 'tenant_domains' && c.eqs.active === true)).toBe(true)
  })

  it('returns null when neither table matches', async () => {
    resolve = () => ({ data: null, error: null })
    expect(await getTenantByDomain('nobody5.com')).toBeNull()
  })

  it('MALFORMED-INPUT PROBE: a mixed-case host (e.g. "WWW.MixedCase7.com") resolves the same as the lowercase host', async () => {
    resolve = (table, eqs) =>
      table === 'tenant_domains' && eqs.domain === 'mixedcase7.com'
        ? { data: domainRow({ tenant_id: 't-mc7', domain: 'mixedcase7.com' }), error: null }
        : table === 'tenants' && eqs.id === 't-mc7'
          ? { data: tenantRow({ id: 't-mc7', slug: 'mixedcase7', domain: 'mixedcase7.com' }), error: null }
          : { data: null, error: null }

    const t = await getTenantByDomain('WWW.MixedCase7.com')
    expect(singleCalls[0].eqs.domain).toBe('mixedcase7.com')
    expect(t?.slug).toBe('mixedcase7')
  })

  it('FALLBACK-QUERY-ERROR PROBE: no tenant_domains row, and the legacy tenants.domain fallback query errors (ambiguous 2+ rows or a genuine DB failure) — refuses rather than silently reporting "tenant not found"', async () => {
    // This is the pure-fallback path: no tenant_domains row exists, so there's
    // nothing to cross-check against. Before this fix, the fallback query used
    // single() with its error discarded, so this looked identical to "unknown
    // host" and returned null silently instead of surfacing the failure.
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

  it('caches a resolved tenant — a second lookup does not re-query', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'cached6.com')
        return { data: domainRow({ tenant_id: 't-6', domain: 'cached6.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-6')
        return { data: tenantRow({ id: 't-6', slug: 'cached6', domain: 'cached6.com' }), error: null }
      return { data: null, error: null }
    }

    const first = await getTenantByDomain('cached6.com')
    const callsAfterFirst = singleCalls.length
    const second = await getTenantByDomain('cached6.com')

    expect(second?.slug).toBe('cached6')
    expect(second).toEqual(first)
    expect(singleCalls.length).toBe(callsAfterFirst) // no new DB calls on the cache hit
  })
})

describe('getTenantBySlug', () => {
  it('MALFORMED-INPUT PROBE: a mixed-case caller-supplied slug (e.g. partner ingest APIs pass tenant_slug unnormalized) resolves the same lowercase-stored tenant', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.slug === 'the-florida-maid'
        ? { data: tenantRow({ id: 't-slug1', slug: 'the-florida-maid', domain: 'thefloridamaid.com' }), error: null }
        : { data: null, error: null }

    const t = await getTenantBySlug('The-Florida-Maid')
    expect(singleCalls[0].eqs.slug).toBe('the-florida-maid')
    expect(t?.id).toBe('t-slug1')
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

describe('invalidateTenantCache', () => {
  it('forces a fresh DB read on the next lookup for a cached domain entry belonging to the invalidated tenant', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'invalidate7.com')
        return { data: domainRow({ tenant_id: 't-7', domain: 'invalidate7.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-7')
        return { data: tenantRow({ id: 't-7', slug: 'invalidate7', domain: 'invalidate7.com' }), error: null }
      return { data: null, error: null }
    }

    await getTenantByDomain('invalidate7.com')
    const callsAfterFirstDomainLookup = singleCalls.length
    await getTenantByDomain('invalidate7.com')
    expect(singleCalls.length).toBe(callsAfterFirstDomainLookup) // cache hit, confirms baseline

    invalidateTenantCache('t-7')

    await getTenantByDomain('invalidate7.com')
    expect(singleCalls.length).toBeGreaterThan(callsAfterFirstDomainLookup) // re-queried after invalidation
  })

  it('WRONG-TENANT PROBE: invalidating tenant A does not evict tenant B\'s cached entry', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'tenant-a8.com')
        return { data: domainRow({ tenant_id: 't-a8', domain: 'tenant-a8.com' }), error: null }
      if (table === 'tenant_domains' && eqs.domain === 'tenant-b8.com')
        return { data: domainRow({ tenant_id: 't-b8', domain: 'tenant-b8.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-a8')
        return { data: tenantRow({ id: 't-a8', slug: 'tenant-a8', domain: 'tenant-a8.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-b8')
        return { data: tenantRow({ id: 't-b8', slug: 'tenant-b8', domain: 'tenant-b8.com' }), error: null }
      return { data: null, error: null }
    }

    await getTenantByDomain('tenant-a8.com')
    await getTenantByDomain('tenant-b8.com')
    const callsAfterBothCached = singleCalls.length

    invalidateTenantCache('t-a8')

    await getTenantByDomain('tenant-b8.com') // tenant B: still cached, no new DB calls
    expect(singleCalls.length).toBe(callsAfterBothCached)

    await getTenantByDomain('tenant-a8.com') // tenant A: evicted, re-queries
    expect(singleCalls.length).toBeGreaterThan(callsAfterBothCached)
  })

  it('also evicts a cached SLUG entry (subdomain routing), not just domain entries', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.slug === 'invalidate-slug11'
        ? { data: tenantRow({ id: 't-11', slug: 'invalidate-slug11', domain: 'invalidate-slug11.com' }), error: null }
        : { data: null, error: null }

    await getTenantBySlug('invalidate-slug11')
    const callsAfterFirst = singleCalls.length
    await getTenantBySlug('invalidate-slug11')
    expect(singleCalls.length).toBe(callsAfterFirst) // cache hit, confirms baseline

    invalidateTenantCache('t-11')

    await getTenantBySlug('invalidate-slug11')
    expect(singleCalls.length).toBeGreaterThan(callsAfterFirst) // re-queried after invalidation
  })

  it('is a no-op for a tenant id with nothing cached', () => {
    expect(() => invalidateTenantCache('t-never-cached')).not.toThrow()
  })
})

describe('invalidateDomainCache', () => {
  it('forces a fresh DB read on the next lookup for the invalidated domain', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'freshclaim9.com')
        return { data: domainRow({ tenant_id: 't-9b', domain: 'freshclaim9.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-9b')
        return { data: tenantRow({ id: 't-9b', slug: 'freshclaim9', domain: 'freshclaim9.com' }), error: null }
      return { data: null, error: null }
    }

    await getTenantByDomain('freshclaim9.com')
    const callsAfterFirst = singleCalls.length
    await getTenantByDomain('freshclaim9.com')
    expect(singleCalls.length).toBe(callsAfterFirst) // cache hit, confirms baseline

    invalidateDomainCache('freshclaim9.com')

    await getTenantByDomain('freshclaim9.com')
    expect(singleCalls.length).toBeGreaterThan(callsAfterFirst) // re-queried after invalidation
  })

  it('clears a NEGATIVE (not-found) cache entry — the exact bug this fixes: a domain that 404\'d once before being registered would otherwise keep 404ing for the rest of the TTL', async () => {
    resolve = () => ({ data: null, error: null }) // domain resolves to nobody

    const before = await getTenantByDomain('wasnegative10.com')
    expect(before).toBeNull()
    const callsAfterNegativeCache = singleCalls.length

    await getTenantByDomain('wasnegative10.com')
    expect(singleCalls.length).toBe(callsAfterNegativeCache) // negative cache hit, no re-query

    invalidateDomainCache('wasnegative10.com')

    // Now the domain has "landed" for a real tenant (as if admin/websites POST
    // just inserted the row) — without the invalidation above this would still
    // return the stale cached null instead of re-querying.
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'wasnegative10.com')
        return { data: domainRow({ tenant_id: 't-10', domain: 'wasnegative10.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-10')
        return { data: tenantRow({ id: 't-10', slug: 'wasnegative10', domain: 'wasnegative10.com' }), error: null }
      return { data: null, error: null }
    }

    const after = await getTenantByDomain('wasnegative10.com')
    expect(after?.id).toBe('t-10')
  })

  it('normalizes www-prefix and case the same way getTenantByDomain does, so invalidating "WWW.Mixed10.com" clears the "mixed10.com" cache key', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'mixed10.com')
        return { data: domainRow({ tenant_id: 't-mixed10', domain: 'mixed10.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-mixed10')
        return { data: tenantRow({ id: 't-mixed10', slug: 'mixed10', domain: 'mixed10.com' }), error: null }
      return { data: null, error: null }
    }

    await getTenantByDomain('mixed10.com')
    const callsAfterFirst = singleCalls.length

    invalidateDomainCache('WWW.Mixed10.com')

    await getTenantByDomain('mixed10.com')
    expect(singleCalls.length).toBeGreaterThan(callsAfterFirst)
  })
})

describe('invalidateSlugCache', () => {
  it('forces a fresh DB read on the next lookup for the invalidated slug', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.slug === 'freshslug12'
        ? { data: tenantRow({ id: 't-12', slug: 'freshslug12' }), error: null }
        : { data: null, error: null }

    await getTenantBySlug('freshslug12')
    const callsAfterFirst = singleCalls.length
    await getTenantBySlug('freshslug12')
    expect(singleCalls.length).toBe(callsAfterFirst) // cache hit, confirms baseline

    invalidateSlugCache('freshslug12')

    await getTenantBySlug('freshslug12')
    expect(singleCalls.length).toBeGreaterThan(callsAfterFirst)
  })

  it('clears a NEGATIVE (not-found) cache entry — the exact bug this fixes: a slug that resolved to "no tenant" once (a deleted tenant\'s old subdomain, or a bot probe) would otherwise keep resolving to nobody for the rest of the TTL even after a new tenant claims it', async () => {
    resolve = () => ({ data: null, error: null }) // slug resolves to nobody

    const before = await getTenantBySlug('wasnegative13')
    expect(before).toBeNull()
    const callsAfterNegativeCache = singleCalls.length

    await getTenantBySlug('wasnegative13')
    expect(singleCalls.length).toBe(callsAfterNegativeCache) // negative cache hit, no re-query

    invalidateSlugCache('wasnegative13')

    // A new tenant has now claimed this exact slug (e.g. re-signup after a
    // delete) — without the invalidation above this would still return the
    // stale cached null instead of re-querying.
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.slug === 'wasnegative13'
        ? { data: tenantRow({ id: 't-13', slug: 'wasnegative13' }), error: null }
        : { data: null, error: null }

    const after = await getTenantBySlug('wasnegative13')
    expect(after?.id).toBe('t-13')
  })

  it('normalizes case the same way getTenantBySlug does, so invalidating "MixedSlug14" clears the "mixedslug14" cache key', async () => {
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.slug === 'mixedslug14'
        ? { data: tenantRow({ id: 't-14', slug: 'mixedslug14' }), error: null }
        : { data: null, error: null }

    await getTenantBySlug('mixedslug14')
    const callsAfterFirst = singleCalls.length

    invalidateSlugCache('MixedSlug14')

    await getTenantBySlug('mixedslug14')
    expect(singleCalls.length).toBeGreaterThan(callsAfterFirst)
  })

  it('is a no-op for a slug with nothing cached', () => {
    expect(() => invalidateSlugCache('never-cached-slug')).not.toThrow()
  })

  it('WRONG-TENANT PROBE: invalidating one slug does not evict a different cached slug\'s entry', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenants' && eqs.slug === 'keep-me-15')
        return { data: tenantRow({ id: 't-15a', slug: 'keep-me-15' }), error: null }
      if (table === 'tenants' && eqs.slug === 'evict-me-15')
        return { data: tenantRow({ id: 't-15b', slug: 'evict-me-15' }), error: null }
      return { data: null, error: null }
    }

    await getTenantBySlug('keep-me-15')
    await getTenantBySlug('evict-me-15')
    const callsAfterBothCached = singleCalls.length

    invalidateSlugCache('evict-me-15')

    await getTenantBySlug('keep-me-15') // untouched slug: still cached, no new DB calls
    expect(singleCalls.length).toBe(callsAfterBothCached)

    await getTenantBySlug('evict-me-15') // evicted slug: re-queries
    expect(singleCalls.length).toBeGreaterThan(callsAfterBothCached)
  })
})
