import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET() (site/template sitemap.xml) — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): the homepage image sitemap entry hardcoded
 * `title: 'Your Business — Logo'` instead of the tenant's real name.
 * Scope note: the ~20 "Your Business" mentions baked into the photo
 * alt/caption DATA file (_lib/seo/photos.ts) are untouched — that's static
 * image alt/caption text, the same L2 body-copy class already carved out of
 * scope by brand.ts's docstring, not a per-page metadata/schema code fix.
 */

let siteConfigName = 'Tenant A Cleaning'
let siteConfigUrl = 'https://a-tenant.example.com'

vi.mock('@/app/site/template/_config/load', () => ({
  getSiteConfig: async () => ({
    identity: { name: siteConfigName, url: siteConfigUrl, siteName: siteConfigName, legalName: null, foundedYear: 2020, logo: undefined },
    contact: { phone: '(212) 555-0100', phoneDigits: '2125550100', email: 'x@example.com', supportPhone: '(212) 555-0100', supportPhoneDigits: '2125550100' },
    geo: { placename: 'New York', region: 'NY', lat: 40.7, lng: -74 },
    theme: { primary: '#000', primaryAlt: '#111' },
    industry: 'cleaning',
  }),
}))

import { GET } from './route'

beforeEach(() => {
  siteConfigName = 'Tenant A Cleaning'
  siteConfigUrl = 'https://a-tenant.example.com'
})

describe('site/template sitemap.xml GET() — domain-fallback probe', () => {
  it('homepage logo image title resolves to the tenant name, never the "Your Business" placeholder', async () => {
    const res = await GET()
    const xml = await res.text()
    expect(xml).toContain('Tenant A Cleaning — Logo')
    expect(xml).not.toContain('Your Business — Logo')
    expect(xml).toContain(siteConfigUrl)
  })

  it('wrong-tenant probe: tenant B name never leaks into tenant A\'s sitemap logo entry', async () => {
    siteConfigName = 'Tenant A Cleaning'
    siteConfigUrl = 'https://a-tenant.example.com'
    const resA = await GET()
    const xmlA = await resA.text()
    expect(xmlA).not.toContain('Tenant B Cleaning — Logo')
    expect(xmlA).not.toContain('b-tenant.example.com')

    siteConfigName = 'Tenant B Cleaning'
    siteConfigUrl = 'https://b-tenant.example.com'
    const resB = await GET()
    const xmlB = await resB.text()
    expect(xmlB).toContain('Tenant B Cleaning — Logo')
    expect(xmlB).toContain('https://b-tenant.example.com')
  })
})
