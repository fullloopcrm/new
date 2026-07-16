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
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

import { getTenantByDomain } from './tenant-lookup'

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
