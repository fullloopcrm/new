import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateMetadata() (site/template [slug] area/neighborhood pages) —
 * SIGNAL apply-layer wiring bug-class probe.
 *
 * BUG (fixed here): same shape as the homepage (page.seo-override-guard.test.ts)
 * -- generateMetadata() never consulted seo_overrides, so an admin-approved
 * or autopilot-applied title/meta fix for one of these area/neighborhood
 * pages silently changed nothing on the live page. Fixed by consulting
 * getSeoOverride(url) for both the area and neighborhood branches, keyed by
 * the same canonical url the page already computes.
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

const AREA_SLUG = 'manhattan-maid-service'
const NEIGHBORHOOD_SLUG = 'upper-east-side-maid-service'

beforeEach(() => {
  overridesByUrl = {}
  siteConfigUrl = TENANT_A_URL
})

describe('site/template [slug] generateMetadata() — seo_overrides apply-layer probe', () => {
  it('uses the template default when no override exists (area branch)', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: AREA_SLUG }) })
    expect(meta.description).toContain('$59/hr')
  })

  it('an approved override for this exact area url wins over the template default', async () => {
    const url = `${TENANT_A_URL}/${AREA_SLUG}`
    overridesByUrl[url] = { title: 'Approved Area Title', description: 'Approved area description.' }
    const meta = await generateMetadata({ params: Promise.resolve({ slug: AREA_SLUG }) })
    expect((meta.title as { absolute: string }).absolute).toBe('Approved Area Title')
    expect(meta.description).toBe('Approved area description.')
  })

  it('an approved override for this exact neighborhood url wins over the template default', async () => {
    const url = `${TENANT_A_URL}/${NEIGHBORHOOD_SLUG}`
    overridesByUrl[url] = { title: 'Approved Neighborhood Title', description: 'Approved neighborhood description.' }
    const meta = await generateMetadata({ params: Promise.resolve({ slug: NEIGHBORHOOD_SLUG }) })
    expect((meta.title as { absolute: string }).absolute).toBe('Approved Neighborhood Title')
    expect(meta.description).toBe('Approved neighborhood description.')
  })

  it("wrong-tenant probe: tenant B's applied override never leaks into tenant A's area metadata", async () => {
    overridesByUrl[`${TENANT_B_URL}/${AREA_SLUG}`] = { title: 'Tenant B Only Title', description: 'Tenant B only description.' }
    siteConfigUrl = TENANT_A_URL
    const meta = await generateMetadata({ params: Promise.resolve({ slug: AREA_SLUG }) })
    expect((meta.title as { absolute: string }).absolute).not.toBe('Tenant B Only Title')

    siteConfigUrl = TENANT_B_URL
    const metaB = await generateMetadata({ params: Promise.resolve({ slug: AREA_SLUG }) })
    expect((metaB.title as { absolute: string }).absolute).toBe('Tenant B Only Title')
  })
})
