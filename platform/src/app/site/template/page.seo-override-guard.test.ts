import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateMetadata() (site/template homepage) — SIGNAL apply-layer wiring
 * bug-class probe.
 *
 * BUG (fixed here): `seo_overrides` (the table BOTH the admin-review "Apply"
 * button — /api/admin/seo/apply — AND autopilot's runAutopilot() write to
 * for every tenant property onboard.ts registers) had exactly one reader in
 * the whole app: the FL marketing combo pages ([combo]/page.tsx). No
 * tenant's actual site — this shared template included — ever consulted it.
 * That meant an admin approving a Tier-1 title/meta fix for any real tenant
 * (or autopilot auto-applying one) silently changed nothing on that
 * tenant's live homepage: seo_changes flipped to 'applied', the weekly rate
 * cap got consumed, and 4 weeks later verify-revert would judge a change
 * that was never actually live, off pure ranking noise. Fixed by having the
 * homepage's generateMetadata() consult getSeoOverride() (keyed by this
 * tenant's own canonical identity.url) the same way the combo pages already
 * did, so an approved fix actually reaches the page search engines see.
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

beforeEach(() => {
  overridesByUrl = {}
  siteConfigUrl = TENANT_A_URL
})

describe('site/template homepage generateMetadata() — seo_overrides apply-layer probe', () => {
  it('uses the template default title/description when no override exists for this url', async () => {
    const meta = await generateMetadata()
    expect(meta.description).toContain('NYC')
    expect((meta.title as { absolute: string }).absolute).toContain('5-Star Rated')
  })

  it('an approved/applied seo_overrides row for this exact url wins over the template default', async () => {
    overridesByUrl[TENANT_A_URL] = { title: 'Approved SEO Title', description: 'Approved SEO description.' }
    const meta = await generateMetadata()
    expect((meta.title as { absolute: string }).absolute).toBe('Approved SEO Title')
    expect(meta.description).toBe('Approved SEO description.')
    expect(meta.openGraph?.title).toBe('Approved SEO Title')
    expect(meta.openGraph?.description).toBe('Approved SEO description.')
    expect(meta.twitter?.title).toBe('Approved SEO Title')
    expect(meta.twitter?.description).toBe('Approved SEO description.')
  })

  it('a partial override (title only) leaves description on the template default, not blanked', async () => {
    overridesByUrl[TENANT_A_URL] = { title: 'Approved SEO Title', description: null }
    const meta = await generateMetadata()
    expect((meta.title as { absolute: string }).absolute).toBe('Approved SEO Title')
    expect(meta.description).toContain('NYC')
  })

  it("wrong-tenant probe: tenant B's applied override never leaks into tenant A's homepage metadata", async () => {
    overridesByUrl[TENANT_B_URL] = { title: 'Tenant B Only Title', description: 'Tenant B only description.' }
    siteConfigUrl = TENANT_A_URL
    const meta = await generateMetadata()
    expect((meta.title as { absolute: string }).absolute).not.toBe('Tenant B Only Title')
    expect(meta.description).not.toBe('Tenant B only description.')

    siteConfigUrl = TENANT_B_URL
    const metaB = await generateMetadata()
    expect((metaB.title as { absolute: string }).absolute).toBe('Tenant B Only Title')
    expect(metaB.description).toBe('Tenant B only description.')
  })
})
