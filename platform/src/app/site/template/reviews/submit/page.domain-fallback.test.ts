import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateMetadata() (site/template reviews/submit) — resolver-precedence
 * bug-class probe.
 *
 * BUG (fixed here): this page used `export const metadata` with an ABSOLUTE
 * hardcoded OG url (`https://www.example.com/reviews/submit`) and "Your
 * Business" in title/description for every tenant. Fixed by converting to
 * generateMetadata() and threading toBrand(await getSiteConfig()).
 */

const TENANT_A_URL = 'https://a-tenant.example.com'
const TENANT_B_URL = 'https://b-tenant.example.com'

let siteConfigUrl = TENANT_A_URL
let siteConfigName = 'Tenant A Cleaning'

vi.mock('@/app/site/template/_config/load', () => ({
  getSiteConfig: async () => ({
    identity: { name: siteConfigName, url: siteConfigUrl, siteName: siteConfigName, legalName: null, foundedYear: 2020, logo: undefined },
    contact: { phone: '(212) 555-0100', phoneDigits: '2125550100', email: 'x@example.com', supportPhone: '(212) 555-0100', supportPhoneDigits: '2125550100' },
    geo: { placename: 'New York', region: 'NY', lat: 40.7, lng: -74 },
    theme: { primary: '#000', primaryAlt: '#111' },
    industry: 'cleaning',
  }),
}))

import { generateMetadata } from './page'

beforeEach(() => {
  siteConfigUrl = TENANT_A_URL
  siteConfigName = 'Tenant A Cleaning'
})

describe('site/template reviews/submit generateMetadata() — domain-fallback probe', () => {
  it('OG url resolves to the tenant siteConfig url, never the absolute example.com literal', async () => {
    const meta = await generateMetadata()
    expect(meta.openGraph?.url).toBe(`${TENANT_A_URL}/reviews/submit`)
    expect(meta.openGraph?.url).not.toContain('www.example.com')
  })

  it('title/description resolve to the tenant, never the "Your Business" placeholder', async () => {
    const meta = await generateMetadata()
    expect(meta.title).toContain('Tenant A Cleaning')
    expect(meta.title).not.toContain('Your Business')
  })

  it('wrong-tenant probe: tenant B url/name never leak into tenant A\'s metadata', async () => {
    siteConfigUrl = TENANT_A_URL
    siteConfigName = 'Tenant A Cleaning'
    const metaA = await generateMetadata()
    expect(metaA.openGraph?.url).not.toContain('b-tenant')

    siteConfigUrl = TENANT_B_URL
    siteConfigName = 'Tenant B Cleaning'
    const metaB = await generateMetadata()
    expect(metaB.openGraph?.url).toBe(`${TENANT_B_URL}/reviews/submit`)
    expect(metaB.title).toContain('Tenant B Cleaning')
  })
})
