import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateMetadata() (site/template service-areas) — resolver-precedence
 * bug-class probe.
 *
 * BUG (fixed here): this page used `export const metadata` — a compile-time
 * literal that can NEVER resolve per-tenant, regardless of getSiteConfig's
 * resolver fix (f47cacb4). title/description hardcoded "Your Business" /
 * "(555) 555-5555" for every tenant. Fixed by converting to
 * `generateMetadata()` and threading toBrand(await getSiteConfig()) the same
 * way the other template pages do.
 */

let siteConfigName = 'Tenant A Cleaning'
let siteConfigPhone = '(212) 555-0100'

vi.mock('@/app/site/template/_config/load', () => ({
  getSiteConfig: async () => ({
    identity: { name: siteConfigName, url: 'https://a-tenant.example.com', siteName: siteConfigName, legalName: null, foundedYear: 2020, logo: undefined },
    contact: { phone: siteConfigPhone, phoneDigits: '2125550100', email: 'x@example.com', supportPhone: siteConfigPhone, supportPhoneDigits: '2125550100' },
    geo: { placename: 'New York', region: 'NY', lat: 40.7, lng: -74 },
    theme: { primary: '#000', primaryAlt: '#111' },
    industry: 'cleaning',
  }),
}))

import { generateMetadata } from './page'

beforeEach(() => {
  siteConfigName = 'Tenant A Cleaning'
  siteConfigPhone = '(212) 555-0100'
})

describe('site/template service-areas generateMetadata() — domain-fallback probe', () => {
  it('title/description resolve to the tenant, never the "Your Business" / (555) placeholder', async () => {
    const meta = await generateMetadata()
    expect(meta.title).toContain('Tenant A Cleaning')
    expect(meta.title).not.toContain('Your Business')
    expect(meta.description).toContain('(212) 555-0100')
    expect(meta.description).not.toContain('(555) 555-5555')
  })

  it('wrong-tenant probe: tenant B name never leaks into tenant A\'s service-areas metadata', async () => {
    siteConfigName = 'Tenant A Cleaning'
    siteConfigPhone = '(212) 555-0100'
    const metaA = await generateMetadata()
    expect(metaA.title).not.toContain('Tenant B Cleaning')

    siteConfigName = 'Tenant B Cleaning'
    siteConfigPhone = '(646) 555-0200'
    const metaB = await generateMetadata()
    expect(metaB.title).toContain('Tenant B Cleaning')
    expect(metaB.description).toContain('(646) 555-0200')
  })
})
