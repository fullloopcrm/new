import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateMetadata() (site/template pricing) — SIGNAL apply-layer wiring
 * bug-class probe, same shape as the homepage/[slug] family fixes.
 */

const TENANT_A_URL = 'https://a-tenant.example.com'
const TENANT_B_URL = 'https://b-tenant.example.com'

let overridesByUrl: Record<string, { title?: string | null; description?: string | null } | null> = {}
let siteConfigUrl = TENANT_A_URL

vi.mock('@/app/site/template/_config/load', () => ({
  getSiteConfig: async () => ({
    identity: { name: 'Test Tenant', url: siteConfigUrl, siteName: 'Test Tenant', legalName: null, foundedYear: 2020, logo: undefined },
    contact: { phone: '555-1234', phoneDigits: '5551234', email: 'x@example.com', supportPhone: '555-1234', supportPhoneDigits: '5551234' },
    geo: { region: 'NY', placename: 'New York', lat: 40.7, lng: -74 },
    theme: { primary: '#000', primaryAlt: '#111', accent: '#0a0' },
    agent: { name: 'Assistant' },
    rating: 5,
    reviewCount: '50+',
    services: [{ value: 'Standard Cleaning', label: 'Standard', hours: 2 }],
    funnelMode: 'booking',
    industry: 'cleaning',
  }),
}))

vi.mock('@/lib/seo/overrides', () => ({
  getSeoOverride: async (url: string) => overridesByUrl[url] ?? null,
}))

vi.mock('@/app/site/template/_lib/content/longform', () => ({
  pricingContent: () => ({ title: 'Default Pricing Title', metaDescription: 'Default pricing description.' }),
}))

import { generateMetadata } from './page'

beforeEach(() => {
  overridesByUrl = {}
  siteConfigUrl = TENANT_A_URL
})

describe('site/template pricing generateMetadata() — seo_overrides apply-layer probe', () => {
  it('uses the template default when no override exists for this url', async () => {
    const meta = await generateMetadata()
    expect(meta.title).toBe('Default Pricing Title')
    expect(meta.description).toBe('Default pricing description.')
  })

  it('an approved override for this exact url wins over the template default', async () => {
    overridesByUrl[`${TENANT_A_URL}/pricing`] = { title: 'Approved Title', description: 'Approved description.' }
    const meta = await generateMetadata()
    expect(meta.title).toBe('Approved Title')
    expect(meta.description).toBe('Approved description.')
  })

  it("wrong-tenant probe: tenant B's applied override never leaks into tenant A's pricing metadata", async () => {
    overridesByUrl[`${TENANT_B_URL}/pricing`] = { title: 'Tenant B Only Title', description: 'Tenant B only description.' }
    siteConfigUrl = TENANT_A_URL
    const meta = await generateMetadata()
    expect(meta.title).not.toBe('Tenant B Only Title')

    siteConfigUrl = TENANT_B_URL
    const metaB = await generateMetadata()
    expect(metaB.title).toBe('Tenant B Only Title')
  })
})
