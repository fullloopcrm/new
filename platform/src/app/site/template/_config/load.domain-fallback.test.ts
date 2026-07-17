import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getSiteConfig() — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): identity.url — the canonical/OG/JSON-LD origin for every
 * page the shared template renders (home, blog, blog posts, service pages,
 * area pages, legal pages, sitemap.xml) — was built from
 * `tenant.domain ?? tenant.domain_name` directly, never consulting
 * `tenant_domains`. admin/websites writes tenant_domains only, never
 * tenants.domain/domain_name (the normal state), so a tenant whose custom
 * domain lives only in tenant_domains and has no website_url set fell all
 * the way through to the neutral `https://example.com` default — wrong
 * canonical tags, OG urls, and sitemap entries across its entire site. Fixed
 * by resolving through getPrimaryTenantDomain() first, tenants.domain /
 * domain_name as fallback — same precedence as tenantSiteUrl()/
 * resolveOrigin()'s other callers.
 */

const TENANT_A_ID = 'tid-config-a'
const TENANT_B_ID = 'tid-config-b'

let tenantRow: Record<string, unknown> | null = null
let tenantDomainsRows: Record<string, unknown>[] = []

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => tenantRow,
}))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      order: () => chain,
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        resolve({ data: getRows().filter((r) => filters.every((f) => f(r))), error: null })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenant_domains') return makeTable(() => tenantDomainsRows)()
      // google_reviews / service_types — no rows needed for this probe.
      return makeTable(() => [])()
    },
  },
}))

import { getSiteConfig } from './load'

function baseTenant(id: string): Record<string, unknown> {
  return {
    id,
    name: 'Test Tenant',
    domain: null,
    domain_name: null,
    website_url: null,
    phone: null,
    owner_phone: null,
    sms_number: null,
    selena_config: {},
    address: null,
    industry: 'cleaning',
  }
}

beforeEach(() => {
  tenantDomainsRows = []
  tenantRow = baseTenant(TENANT_A_ID)
})

describe('getSiteConfig() — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain/domain_name are null but tenant_domains has an active PRIMARY row — identity.url uses that host, not the example.com default', async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A_ID, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const config = await getSiteConfig()
    expect(config.identity.url).toBe('https://custom.example.com')
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    tenantRow = { ...baseTenant(TENANT_A_ID), domain: 'legacy.example.com' }
    const config = await getSiteConfig()
    expect(config.identity.url).toBe('https://legacy.example.com')
  })

  it('falls back to tenants.domain_name when domain and tenant_domains both resolve to nothing', async () => {
    tenantRow = { ...baseTenant(TENANT_A_ID), domain_name: 'legacy-name.example.com' }
    const config = await getSiteConfig()
    expect(config.identity.url).toBe('https://legacy-name.example.com')
  })

  it('falls back to the neutral default only when tenant_domains, domain, domain_name, and website_url all resolve to nothing', async () => {
    const config = await getSiteConfig()
    expect(config.identity.url).toBe('https://example.com')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's identity.url", async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A_ID, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: TENANT_B_ID, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]

    tenantRow = baseTenant(TENANT_A_ID)
    const configA = await getSiteConfig()
    expect(configA.identity.url).toBe('https://a-real.example.com')

    tenantRow = baseTenant(TENANT_B_ID)
    const configB = await getSiteConfig()
    expect(configB.identity.url).toBe('https://b-real.example.com')
  })
})
