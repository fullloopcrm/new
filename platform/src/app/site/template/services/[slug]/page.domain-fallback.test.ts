import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateMetadata() (site/template services/[slug]) — resolver-precedence
 * bug-class probe.
 *
 * BUG (fixed here): canonical/OG url, siteName, and phone were hardcoded
 * literals (`https://www.example.com/services/${slug}`, "Your Business",
 * "(555) 555-5555") instead of resolving through the tenant's siteConfig
 * (which itself resolves tenant_domains first, tenants.domain as fallback —
 * f47cacb4). Every tenant on this shared template served the exact same
 * wrong canonical domain and boilerplate brand name on every service detail
 * page, identical in shape to the [slug]/page.tsx (neighborhood) and
 * homepage bugs already fixed, but never wired here. Fixed by threading
 * toBrand(await getSiteConfig()) the same way [slug]/page.tsx already does.
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

const SERVICE_SLUG = 'deep-cleaning-service-in-nyc'

beforeEach(() => {
  siteConfigUrl = TENANT_A_URL
  siteConfigName = 'Tenant A Cleaning'
})

describe('site/template services/[slug] generateMetadata() — domain-fallback probe', () => {
  it('canonical/OG url resolve to the tenant siteConfig url, never the example.com literal', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: SERVICE_SLUG }) })
    expect(meta.alternates?.canonical).toBe(`${TENANT_A_URL}/services/${SERVICE_SLUG}`)
    expect(meta.openGraph?.url).toBe(`${TENANT_A_URL}/services/${SERVICE_SLUG}`)
    expect(meta.alternates?.canonical).not.toContain('www.example.com')
  })

  it('siteName and phone resolve to the tenant, never the "Your Business" / (555) placeholder', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: SERVICE_SLUG }) })
    expect(meta.openGraph?.siteName).toBe('Tenant A Cleaning')
    expect((meta.title as { absolute: string }).absolute).toContain('Tenant A Cleaning')
    expect((meta.title as { absolute: string }).absolute).not.toContain('Your Business')
    expect(meta.description).toContain('(212) 555-0100')
    expect(meta.description).not.toContain('(555) 555-5555')
  })

  it('wrong-tenant probe: tenant B url/name never leak into tenant A\'s service page metadata', async () => {
    siteConfigUrl = TENANT_A_URL
    siteConfigName = 'Tenant A Cleaning'
    const metaA = await generateMetadata({ params: Promise.resolve({ slug: SERVICE_SLUG }) })
    expect(metaA.alternates?.canonical).not.toContain('b-tenant')
    expect(metaA.openGraph?.siteName).not.toBe('Tenant B Cleaning')

    siteConfigUrl = TENANT_B_URL
    siteConfigName = 'Tenant B Cleaning'
    const metaB = await generateMetadata({ params: Promise.resolve({ slug: SERVICE_SLUG }) })
    expect(metaB.alternates?.canonical).toBe(`${TENANT_B_URL}/services/${SERVICE_SLUG}`)
    expect(metaB.openGraph?.siteName).toBe('Tenant B Cleaning')
  })

  it('returns empty metadata for an unknown service slug (unchanged behavior)', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: 'not-a-real-service' }) })
    expect(meta).toEqual({})
  })
})
