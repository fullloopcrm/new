import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateMetadata() (site/template [slug]/[service] neighborhood x service
 * combo pages) — SIGNAL apply-layer wiring bug-class probe.
 *
 * BUG (fixed here): same shape as the homepage (page.seo-override-guard.test.ts)
 * -- generateMetadata() never consulted seo_overrides. This is the
 * highest-cardinality page type on the shared template (225+ neighborhoods
 * x ~10 services per tenant), so an admin-approved or autopilot-applied
 * title/meta fix for any one of those combos silently changed nothing.
 * Fixed by consulting getSeoOverride(url).
 */

const TENANT_A_URL = 'https://a-tenant.example.com'
const TENANT_B_URL = 'https://b-tenant.example.com'

let overridesByUrl: Record<string, { title?: string | null; description?: string | null } | null> = {}
let siteConfigUrl = TENANT_A_URL

vi.mock('@/app/site/template/_config/load', () => ({
  getSiteConfig: async () => ({
    identity: { name: 'Test Tenant', url: siteConfigUrl, siteName: 'Test Tenant', legalName: null, foundedYear: 2020, logo: undefined },
    contact: { phone: '555-1234', phoneDigits: '5551234', email: 'x@example.com', supportPhone: '555-1234', supportPhoneDigits: '5551234' },
    geo: { placename: 'New York', region: 'NY', lat: 40.7, lng: -74 },
    theme: { primary: '#000', primaryAlt: '#111' },
    industry: 'cleaning',
  }),
}))

vi.mock('@/lib/seo/overrides', () => ({
  getSeoOverride: async (url: string) => overridesByUrl[url] ?? null,
}))

import { generateMetadata } from './page'

const NEIGHBORHOOD_SLUG = 'upper-east-side-maid-service'
const SERVICE_SLUG = 'deep-cleaning'

beforeEach(() => {
  overridesByUrl = {}
  siteConfigUrl = TENANT_A_URL
})

describe('site/template [slug]/[service] generateMetadata() — seo_overrides apply-layer probe', () => {
  it('uses the template default when no override exists for this url', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: NEIGHBORHOOD_SLUG, service: SERVICE_SLUG }) })
    expect(meta.description).toContain('5.0★')
  })

  it('an approved override for this exact combo-page url wins over the template default', async () => {
    const url = `${TENANT_A_URL}/${NEIGHBORHOOD_SLUG}/${SERVICE_SLUG}`
    overridesByUrl[url] = { title: 'Approved Combo Title', description: 'Approved combo description.' }
    const meta = await generateMetadata({ params: Promise.resolve({ slug: NEIGHBORHOOD_SLUG, service: SERVICE_SLUG }) })
    expect((meta.title as { absolute: string }).absolute).toBe('Approved Combo Title')
    expect(meta.description).toBe('Approved combo description.')
  })

  it("wrong-tenant probe: tenant B's applied override never leaks into tenant A's combo-page metadata", async () => {
    overridesByUrl[`${TENANT_B_URL}/${NEIGHBORHOOD_SLUG}/${SERVICE_SLUG}`] = { title: 'Tenant B Only Title', description: 'Tenant B only description.' }
    siteConfigUrl = TENANT_A_URL
    const meta = await generateMetadata({ params: Promise.resolve({ slug: NEIGHBORHOOD_SLUG, service: SERVICE_SLUG }) })
    expect((meta.title as { absolute: string }).absolute).not.toBe('Tenant B Only Title')

    siteConfigUrl = TENANT_B_URL
    const metaB = await generateMetadata({ params: Promise.resolve({ slug: NEIGHBORHOOD_SLUG, service: SERVICE_SLUG }) })
    expect((metaB.title as { absolute: string }).absolute).toBe('Tenant B Only Title')
  })
})
