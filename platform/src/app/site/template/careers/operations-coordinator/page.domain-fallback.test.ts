import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateMetadata() (site/template careers/operations-coordinator) —
 * resolver-precedence bug-class probe.
 *
 * BUG (fixed here): this page used `export const metadata` with hardcoded
 * "Your Business" title/description. Fixed by converting to
 * generateMetadata() and reading config.identity.name per-tenant.
 * (The page's body copy and JobPosting compensation narrative are bespoke
 * to this one business's real hiring numbers and are intentionally left
 * untouched — this probe covers only the tenant-identity fields: title,
 * description, and the JobPosting schema's hiringOrganization/url/contact,
 * same L1 scope boundary as the rest of this lane's brand-identity fixes.)
 */

let siteConfigName = 'Tenant A Cleaning'

vi.mock('@/app/site/template/_config/load', () => ({
  getSiteConfig: async () => ({
    identity: { name: siteConfigName, url: 'https://a-tenant.example.com', siteName: siteConfigName, legalName: null, foundedYear: 2020, logo: undefined },
    contact: { phone: '(212) 555-0100', phoneDigits: '2125550100', email: 'ops@a-tenant.example.com', supportPhone: '(212) 555-0100', supportPhoneDigits: '2125550100' },
    geo: { placename: 'New York', region: 'NY', lat: 40.7, lng: -74 },
    theme: { primary: '#000', primaryAlt: '#111' },
    industry: 'cleaning',
  }),
}))

import { generateMetadata } from './page'

beforeEach(() => {
  siteConfigName = 'Tenant A Cleaning'
})

describe('site/template careers/operations-coordinator generateMetadata() — domain-fallback probe', () => {
  it('title/description resolve to the tenant, never the "Your Business" placeholder', async () => {
    const meta = await generateMetadata()
    expect(meta.title).toContain('Tenant A Cleaning')
    expect(meta.title).not.toContain('Your Business')
  })

  it('wrong-tenant probe: tenant B name never leaks into tenant A\'s metadata', async () => {
    siteConfigName = 'Tenant A Cleaning'
    const metaA = await generateMetadata()
    expect(metaA.title).not.toContain('Tenant B Cleaning')

    siteConfigName = 'Tenant B Cleaning'
    const metaB = await generateMetadata()
    expect(metaB.title).toContain('Tenant B Cleaning')
  })
})
