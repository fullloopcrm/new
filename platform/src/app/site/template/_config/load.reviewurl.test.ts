import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getSiteConfig() — reviewUrl resolver-precedence bug-class probe.
 *
 * BUG (fixed here): CTABlock.tsx (rendered by 9 site/template pages) hardcoded
 * "Write a Review" -> https://g.page/r/CSX9IqciUG9SEAE/review, nycmaid's own
 * real Google listing, for EVERY tenant regardless of domain. A competing
 * tenant's customer clicking "Write a Review" would land on nycmaid's Google
 * Business profile instead of their own. Fixed by adding SiteConfig.reviewUrl,
 * resolved with the same precedence as messaging/brand.ts's tenantBrand() and
 * /api/reviews/request: a real tenants.google_place_id builds the canonical
 * search.google.com write-review URL; a stored raw
 * selena_config.google_review_link is the next fallback; otherwise the
 * neutral internal /reviews/submit page -- never another tenant's real
 * listing.
 */

const TENANT_A_ID = 'tid-review-a'
const TENANT_B_ID = 'tid-review-b'

let tenantRow: Record<string, unknown> | null = null

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
    from: () => makeTable(() => [])(),
  },
}))

import { getSiteConfig } from './load'

function baseTenant(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    name: 'Test Tenant',
    domain: null,
    domain_name: null,
    website_url: null,
    phone: null,
    owner_phone: null,
    sms_number: null,
    google_place_id: null,
    selena_config: {},
    address: null,
    industry: 'cleaning',
    ...overrides,
  }
}

beforeEach(() => {
  tenantRow = baseTenant(TENANT_A_ID)
})

describe('getSiteConfig() — reviewUrl bug-class probe', () => {
  it('builds the canonical write-review URL from a real google_place_id', async () => {
    tenantRow = baseTenant(TENANT_A_ID, { google_place_id: 'ChIJ-real-place-id' })
    const config = await getSiteConfig()
    expect(config.reviewUrl).toBe('https://search.google.com/local/writereview?placeid=ChIJ-real-place-id')
  })

  it('falls back to a stored selena_config.google_review_link when no place id is configured', async () => {
    tenantRow = baseTenant(TENANT_A_ID, { selena_config: { google_review_link: 'https://g.page/r/tenant-a-real/review' } })
    const config = await getSiteConfig()
    expect(config.reviewUrl).toBe('https://g.page/r/tenant-a-real/review')
  })

  it('prefers google_place_id over a stored google_review_link when both are set', async () => {
    tenantRow = baseTenant(TENANT_A_ID, {
      google_place_id: 'ChIJ-preferred',
      selena_config: { google_review_link: 'https://g.page/r/should-not-win/review' },
    })
    const config = await getSiteConfig()
    expect(config.reviewUrl).toBe('https://search.google.com/local/writereview?placeid=ChIJ-preferred')
  })

  it('falls back to the neutral internal /reviews/submit page when neither is configured -- never a hardcoded real business listing', async () => {
    const config = await getSiteConfig()
    expect(config.reviewUrl).toBe('/reviews/submit')
    expect(config.reviewUrl).not.toContain('g.page')
    expect(config.reviewUrl).not.toContain('CSX9IqciUG9SEAE')
  })

  it("wrong-tenant probe: tenant B's google_place_id never leaks into tenant A's reviewUrl", async () => {
    tenantRow = baseTenant(TENANT_A_ID, { google_place_id: 'ChIJ-tenant-a' })
    const configA = await getSiteConfig()
    expect(configA.reviewUrl).toBe('https://search.google.com/local/writereview?placeid=ChIJ-tenant-a')

    tenantRow = baseTenant(TENANT_B_ID, { google_place_id: 'ChIJ-tenant-b' })
    const configB = await getSiteConfig()
    expect(configB.reviewUrl).toBe('https://search.google.com/local/writereview?placeid=ChIJ-tenant-b')

    expect(configA.reviewUrl).not.toBe(configB.reviewUrl)
  })

  it("wrong-tenant probe: an unconfigured tenant never inherits another tenant's real review link", async () => {
    tenantRow = baseTenant(TENANT_A_ID, { selena_config: { google_review_link: 'https://g.page/r/tenant-a-real/review' } })
    await getSiteConfig()

    // Tenant B has nothing configured -- must resolve to the neutral default,
    // not tenant A's link from the previous request.
    tenantRow = baseTenant(TENANT_B_ID)
    const configB = await getSiteConfig()
    expect(configB.reviewUrl).toBe('/reviews/submit')
  })
})
