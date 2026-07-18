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
let lastOrder: { col: string; ascending?: boolean } | undefined

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    neq: (col: string, val: unknown) => {
      eqs[`neq_${col}`] = val
      return chain
    },
    contains: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: (col: string, opts?: { ascending?: boolean }) => {
      lastOrder = { col, ascending: opts?.ascending }
      return chain
    },
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
  findDomainOwner,
  extractZip,
} from './domains'

describe('getTenantDomains', () => {
  it('returns the active domain rows for a tenant', async () => {
    resolve = () => ({ data: [{ id: 'd1', tenant_id: 't-1', domain: 'acme.com', type: 'primary', active: true }] })
    const rows = await getTenantDomains('t-1')
    expect(rows).toEqual([{ id: 'd1', tenant_id: 't-1', domain: 'acme.com', type: 'primary', active: true }])
  })

  it('returns [] (not null/throw) when the tenant has no domains', async () => {
    resolve = () => ({ data: null, error: null })
    const rows = await getTenantDomains('t-1')
    expect(rows).toEqual([])
  })

  it('MASKED-ERROR PROBE: throws loud on a genuine DB error instead of silently returning [] — indistinguishable from "no domains" otherwise', async () => {
    resolve = () => ({ data: null, error: { message: 'connection timeout' } })
    await expect(getTenantDomains('t-1')).rejects.toThrow(/TENANT_DOMAINS_LOOKUP_ERROR/)
  })
})

describe('getOwnedDomainSet', () => {
  it('includes both the bare domain and its www. variant for every row, unioned with the legacy tenants.domain/domain_name columns', async () => {
    resolve = (table) =>
      table === 'tenant_domains'
        ? {
            data: [
              { id: 'd1', tenant_id: 't-1', domain: 'acme.com', type: 'primary', active: true },
              { id: 'd2', tenant_id: 't-1', domain: 'brooklyn.acme.com', type: 'neighborhood', active: true },
            ],
          }
        : { data: { domain: 'legacy-acme.com', domain_name: null } }
    const set = await getOwnedDomainSet('t-1')
    expect(set).toEqual(
      new Set([
        'acme.com', 'www.acme.com',
        'brooklyn.acme.com', 'www.brooklyn.acme.com',
        'legacy-acme.com', 'www.legacy-acme.com',
      ]),
    )
  })

  it('MASKED-ORIGIN-GAP PROBE: falls back to the legacy tenants.domain when tenant_domains is empty — a tenant not yet migrated must still recognize its own site as owned, not just tenant_domains-migrated ones', async () => {
    resolve = (table) =>
      table === 'tenant_domains'
        ? { data: [] }
        : { data: { domain: 'https://WWW.Legacy-Only.com/', domain_name: null } }
    const set = await getOwnedDomainSet('t-1')
    expect(set).toEqual(new Set(['legacy-only.com', 'www.legacy-only.com']))
  })

  it('is empty for a tenant with no tenant_domains rows and no legacy domain/domain_name', async () => {
    resolve = (table) => (table === 'tenant_domains' ? { data: [] } : { data: null })
    const set = await getOwnedDomainSet('t-1')
    expect(set.size).toBe(0)
  })

  it('CROSS-TENANT PROBE: a domain that belongs only to a DIFFERENT tenant is never in this tenant\'s owned set', async () => {
    resolve = (table) =>
      table === 'tenant_domains'
        ? { data: [] }
        : { data: { domain: 'this-tenant.com', domain_name: null } }
    const set = await getOwnedDomainSet('t-1')
    expect(set.has('other-tenant.com')).toBe(false)
    expect(set.has('www.other-tenant.com')).toBe(false)
  })

  it('MASKED-ERROR PROBE: throws loud on a genuine DB error from the legacy tenants lookup instead of silently omitting it', async () => {
    resolve = (table) =>
      table === 'tenant_domains'
        ? { data: [] }
        : { data: null, error: { message: 'connection timeout' } }
    await expect(getOwnedDomainSet('t-1')).rejects.toThrow(/OWNED_DOMAIN_SET_TENANT_LOOKUP_ERROR/)
  })
})

describe('getDomainsForNeighborhood', () => {
  it('returns just the domain strings for the matching neighborhood', async () => {
    resolve = () => ({ data: [{ domain: 'brooklyn.acme.com' }, { domain: 'bk.acme.com' }] })
    const domains = await getDomainsForNeighborhood('t-1', 'Brooklyn')
    expect(domains).toEqual(['brooklyn.acme.com', 'bk.acme.com'])
  })

  it('returns [] when no domain is mapped to that neighborhood', async () => {
    resolve = () => ({ data: null, error: null })
    const domains = await getDomainsForNeighborhood('t-1', 'Nowhere')
    expect(domains).toEqual([])
  })

  it('MASKED-ERROR PROBE: throws loud on a genuine DB error instead of silently returning [] — indistinguishable from "nothing mapped" otherwise', async () => {
    resolve = () => ({ data: null, error: { message: 'connection timeout' } })
    await expect(getDomainsForNeighborhood('t-1', 'Brooklyn')).rejects.toThrow(/DOMAINS_FOR_NEIGHBORHOOD_LOOKUP_ERROR/)
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

  it('MULTI-PRIMARY DETERMINISM PROBE: orders by created_at ascending so the OLDEST is_primary row consistently wins when the write-path invariant (single primary per tenant) is somehow violated', async () => {
    lastOrder = undefined
    // Simulates what the DB returns once the query's ORDER BY created_at asc
    // is applied for real — two is_primary=true rows for the same tenant
    // (the admin/websites POST bug this round: adding a second primary never
    // demoted the first). The OLDER row (seeded first here, matching
    // ascending created_at) must win, not whichever the array happens to list
    // last or whichever an unordered DB scan would have returned.
    resolve = () => ({
      data: [
        { domain: 'older-primary.acme.com', is_primary: true, created_at: '2026-01-01T00:00:00Z' },
        { domain: 'newer-primary.acme.com', is_primary: true, created_at: '2026-06-01T00:00:00Z' },
      ],
    })
    expect(await getPrimaryTenantDomain('t-1')).toBe('older-primary.acme.com')
    expect(lastOrder).toEqual({ col: 'created_at', ascending: true })
  })
})

describe('findDomainOwner', () => {
  it('returns null when the domain is unclaimed in both tenant_domains and tenants.domain', async () => {
    resolve = () => ({ data: null })
    expect(await findDomainOwner('acme.com')).toBeNull()
  })

  it('finds the owner via an active tenant_domains row and looks up its name', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains') return { data: { tenant_id: 'owner-1' } }
      if (table === 'tenants' && eqs.id === 'owner-1') return { data: { name: 'Acme Co' } }
      return { data: null }
    }
    expect(await findDomainOwner('acme.com')).toEqual({ tenantId: 'owner-1', tenantName: 'Acme Co', source: 'tenant_domains' })
  })

  it('falls back to the legacy tenants.domain column when tenant_domains has no match', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains') return { data: null }
      if (table === 'tenants' && eqs.domain === 'legacy-acme.com') return { data: { id: 'owner-2', name: 'Other Co' } }
      return { data: null }
    }
    expect(await findDomainOwner('legacy-acme.com')).toEqual({ tenantId: 'owner-2', tenantName: 'Other Co', source: 'tenants.domain' })
  })

  it('SELF-EXCLUSION PROBE: a domain only claimed by the tenant being edited is not reported as a collision', async () => {
    resolve = (table, eqs) => {
      // Simulates the DB respecting .neq('tenant_id'/'id', excludeTenantId) —
      // the only claimant (self) is filtered out, so both queries see nothing.
      if (table === 'tenant_domains') return eqs.neq_tenant_id === 't-1' ? { data: null } : { data: { tenant_id: 't-1' } }
      if (table === 'tenants' && eqs.domain === 'acme.com') return eqs.neq_id === 't-1' ? { data: null } : { data: { id: 't-1', name: 'Self' } }
      return { data: null }
    }
    expect(await findDomainOwner('acme.com', 't-1')).toBeNull()
  })

  it('CROSS-TENANT PROBE: a domain claimed by a DIFFERENT tenant is still reported even when excluding self', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains') return eqs.neq_tenant_id === 't-1' ? { data: { tenant_id: 'owner-3' } } : { data: null }
      if (table === 'tenants' && eqs.id === 'owner-3') return { data: { name: 'Owner Three' } }
      return { data: null }
    }
    expect(await findDomainOwner('acme.com', 't-1')).toEqual({ tenantId: 'owner-3', tenantName: 'Owner Three', source: 'tenant_domains' })
  })

  it('MASKED-ERROR PROBE: throws loud on a genuine DB error from the tenant_domains check', async () => {
    resolve = (table) => (table === 'tenant_domains' ? { data: null, error: { message: 'connection timeout' } } : { data: null })
    await expect(findDomainOwner('acme.com')).rejects.toThrow(/DOMAIN_OWNER_LOOKUP_ERROR/)
  })

  it('MASKED-ERROR PROBE: throws loud on a genuine DB error from the legacy tenants.domain check', async () => {
    resolve = (table) => (table === 'tenant_domains' ? { data: null } : { data: null, error: { message: 'connection timeout' } })
    await expect(findDomainOwner('acme.com')).rejects.toThrow(/DOMAIN_OWNER_LOOKUP_ERROR/)
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
