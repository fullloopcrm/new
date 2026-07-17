import { describe, it, expect, vi } from 'vitest'

/**
 * domains.ts (tenant_domains reads — used by the resolver's zip/neighborhood
 * routing and by callers building a tenant's owned-domain set) had 0 tests
 * before this file. getNeighborhoodFromZip is the one query here with real
 * masked-error risk: most zips legitimately match zero tenant_domains rows
 * (no neighborhood mapped), which single() used to treat identically to a
 * genuine DB failure — both silently returned null. Covered here alongside
 * the plain-data-shaping helpers.
 */

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error?: unknown }

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    contains: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: () => chain,
    single: async () => resolve(table, eqs),
    maybeSingle: async () => resolve(table, eqs),
    then: (onFulfilled: (v: { data: unknown }) => unknown) =>
      Promise.resolve(resolve(table, eqs)).then(onFulfilled),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import {
  getTenantDomains,
  getOwnedDomainSet,
  getDomainsForNeighborhood,
  getNeighborhoodFromZip,
  getPrimaryTenantDomain,
  extractZip,
} from './domains'

describe('getTenantDomains', () => {
  it('returns the active domain rows for a tenant', async () => {
    resolve = () => ({ data: [{ id: 'd1', tenant_id: 't-1', domain: 'acme.com', type: 'primary', active: true }] })
    const rows = await getTenantDomains('t-1')
    expect(rows).toEqual([{ id: 'd1', tenant_id: 't-1', domain: 'acme.com', type: 'primary', active: true }])
  })

  it('returns [] (not null/throw) when the tenant has no domains', async () => {
    resolve = () => ({ data: null })
    const rows = await getTenantDomains('t-1')
    expect(rows).toEqual([])
  })
})

describe('getOwnedDomainSet', () => {
  it('includes both the bare domain and its www. variant for every row', async () => {
    resolve = () => ({
      data: [
        { id: 'd1', tenant_id: 't-1', domain: 'acme.com', type: 'primary', active: true },
        { id: 'd2', tenant_id: 't-1', domain: 'brooklyn.acme.com', type: 'neighborhood', active: true },
      ],
    })
    const set = await getOwnedDomainSet('t-1')
    expect(set).toEqual(new Set(['acme.com', 'www.acme.com', 'brooklyn.acme.com', 'www.brooklyn.acme.com']))
  })

  it('is empty for a tenant with no domains', async () => {
    resolve = () => ({ data: [] })
    const set = await getOwnedDomainSet('t-1')
    expect(set.size).toBe(0)
  })
})

describe('getDomainsForNeighborhood', () => {
  it('returns just the domain strings for the matching neighborhood', async () => {
    resolve = () => ({ data: [{ domain: 'brooklyn.acme.com' }, { domain: 'bk.acme.com' }] })
    const domains = await getDomainsForNeighborhood('t-1', 'Brooklyn')
    expect(domains).toEqual(['brooklyn.acme.com', 'bk.acme.com'])
  })

  it('returns [] when no domain is mapped to that neighborhood', async () => {
    resolve = () => ({ data: null })
    const domains = await getDomainsForNeighborhood('t-1', 'Nowhere')
    expect(domains).toEqual([])
  })
})

describe('getNeighborhoodFromZip', () => {
  it('returns the neighborhood for a zip mapped in tenant_domains.zip_codes', async () => {
    resolve = () => ({ data: { neighborhood: 'Park Slope' } })
    const n = await getNeighborhoodFromZip('t-1', '11215')
    expect(n).toBe('Park Slope')
  })

  it('returns null (not an error) when the zip legitimately maps to no row — the normal, expected case for most zips', async () => {
    resolve = () => ({ data: null, error: null })
    const n = await getNeighborhoodFromZip('t-1', '00000')
    expect(n).toBeNull()
  })

  it('MASKED-ERROR PROBE: throws loud on a genuine DB error instead of silently returning null — indistinguishable from "no zip mapped" otherwise', async () => {
    resolve = () => ({ data: null, error: { message: 'connection timeout' } })
    await expect(getNeighborhoodFromZip('t-1', '11215')).rejects.toThrow(/TENANT_DOMAIN_ZIP_LOOKUP_ERROR/)
  })
})

describe('getPrimaryTenantDomain', () => {
  it('prefers the row flagged is_primary over other active rows', async () => {
    resolve = () => ({
      data: [
        { domain: 'alias.acme.com', is_primary: false },
        { domain: 'acme.com', is_primary: true },
      ],
    })
    expect(await getPrimaryTenantDomain('t-1')).toBe('acme.com')
  })

  it('falls back to the first active row when none is flagged primary', async () => {
    resolve = () => ({ data: [{ domain: 'alias.acme.com', is_primary: false }] })
    expect(await getPrimaryTenantDomain('t-1')).toBe('alias.acme.com')
  })

  it('returns null when the tenant has no active tenant_domains rows', async () => {
    resolve = () => ({ data: [] })
    expect(await getPrimaryTenantDomain('t-1')).toBeNull()
  })

  it('WRONG-TENANT PROBE: only queries rows for the given tenant_id, never another tenant\'s domain', async () => {
    resolve = (table, eqs) =>
      table === 'tenant_domains' && eqs.tenant_id === 't-1'
        ? { data: [{ domain: 'other-tenants-domain.com', is_primary: true }] }
        : { data: [] }
    expect(await getPrimaryTenantDomain('t-2')).toBeNull()
  })

  it('MASKED-ERROR PROBE: throws loud on a genuine DB error instead of silently returning null', async () => {
    resolve = () => ({ data: null, error: { message: 'connection timeout' } })
    await expect(getPrimaryTenantDomain('t-1')).rejects.toThrow(/PRIMARY_TENANT_DOMAIN_LOOKUP_ERROR/)
  })
})

describe('extractZip', () => {
  it('extracts a trailing 5-digit zip', () => {
    expect(extractZip('123 Main St, Brooklyn, NY 11215')).toBe('11215')
  })

  it('extracts a trailing zip+4', () => {
    expect(extractZip('123 Main St, Brooklyn, NY 11215-1234')).toBe('11215')
  })

  it('falls back to any 5-digit run when there is no trailing zip', () => {
    expect(extractZip('11215 is the zip for this neighborhood')).toBe('11215')
  })

  it('returns null when no zip is present', () => {
    expect(extractZip('123 Main St, Brooklyn, NY')).toBeNull()
  })
})
