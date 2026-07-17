import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/tenant-sitemap — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): baseUrl for every emitted <loc> was built from
 * `tenant.domain` directly, never consulting `tenant_domains`. A tenant
 * reached via a custom domain that lives only in tenant_domains (the normal
 * state — admin/websites writes tenant_domains only, never tenants.domain)
 * had every sitemap URL emitted for the wrong host, even though the request
 * that fetched this sitemap arrived on the correct custom domain via
 * middleware's tenant_domains-based routing. Fixed by resolving through
 * getPrimaryTenantDomain() first, tenants.domain as fallback — same
 * precedence as tenantSiteUrl()/resolveOrigin()'s other callers.
 */

const TENANT_A_SLUG = 'tid-sitemap-a'
const TENANT_B_SLUG = 'tid-sitemap-b'

let tenantsRows: Record<string, unknown>[] = []
let tenantDomainsRows: Record<string, unknown>[] = []
let serviceTypesRows: Record<string, unknown>[] = []

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let orderCol: string | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      order: (col: string) => { orderCol = col; return chain },
      single: () => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        return Promise.resolve({ data: hit[0] || null, error: null })
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (orderCol) hit = [...hit].sort((a, b) => String(a[orderCol as string]).localeCompare(String(b[orderCol as string])))
        resolve({ data: hit, error: null })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return makeTable(() => tenantsRows)()
      if (table === 'tenant_domains') return makeTable(() => tenantDomainsRows)()
      if (table === 'service_types') return makeTable(() => serviceTypesRows)()
      return makeTable(() => [])()
    },
  },
}))

import { NextRequest } from 'next/server'
import { GET } from './route'

function req(slug: string) {
  return new NextRequest(`http://t/api/tenant-sitemap?slug=${slug}`)
}

async function sitemapLocs(slug: string): Promise<string[]> {
  const res = await GET(req(slug))
  const xml = await res.text()
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
}

beforeEach(() => {
  tenantDomainsRows = []
  serviceTypesRows = []
  tenantsRows = [
    {
      id: TENANT_A_SLUG,
      slug: TENANT_A_SLUG,
      status: 'active',
      domain: null,
      website_url: null,
      selena_config: {},
      industry: 'cleaning',
    },
  ]
})

describe('GET /api/tenant-sitemap — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — emits that host, not the platform subdomain', async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A_SLUG, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const locs = await sitemapLocs(TENANT_A_SLUG)
    expect(locs.length).toBeGreaterThan(0)
    expect(locs.every((l) => l.startsWith('https://custom.example.com'))).toBe(true)
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    tenantsRows = [{ ...tenantsRows[0], domain: 'legacy.example.com' }]
    const locs = await sitemapLocs(TENANT_A_SLUG)
    expect(locs.length).toBeGreaterThan(0)
    expect(locs.every((l) => l.startsWith('https://legacy.example.com'))).toBe(true)
  })

  it('falls back to website_url when neither tenant_domains nor tenants.domain resolve', async () => {
    tenantsRows = [{ ...tenantsRows[0], website_url: 'https://via-website-url.example.com' }]
    const locs = await sitemapLocs(TENANT_A_SLUG)
    expect(locs.length).toBeGreaterThan(0)
    expect(locs.every((l) => l.startsWith('https://via-website-url.example.com'))).toBe(true)
  })

  it('falls back to the platform subdomain when nothing else resolves', async () => {
    const locs = await sitemapLocs(TENANT_A_SLUG)
    expect(locs.length).toBeGreaterThan(0)
    expect(locs.every((l) => l.startsWith(`https://${TENANT_A_SLUG}.homeservicesbusinesscrm.com`))).toBe(true)
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's sitemap", async () => {
    tenantsRows = [
      ...tenantsRows,
      { id: TENANT_B_SLUG, slug: TENANT_B_SLUG, status: 'active', domain: null, website_url: null, selena_config: {}, industry: 'cleaning' },
    ]
    tenantDomainsRows = [
      { tenant_id: TENANT_A_SLUG, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: TENANT_B_SLUG, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const locsA = await sitemapLocs(TENANT_A_SLUG)
    const locsB = await sitemapLocs(TENANT_B_SLUG)
    expect(locsA.every((l) => l.startsWith('https://a-real.example.com'))).toBe(true)
    expect(locsB.every((l) => l.startsWith('https://b-real.example.com'))).toBe(true)
  })
})
