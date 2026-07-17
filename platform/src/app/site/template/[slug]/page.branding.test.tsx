import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * site/template area/neighborhood page ([slug]/page.tsx) — client-facing
 * literal-placeholder probe.
 *
 * BUG (fixed here): every `sms:5555555555` href and its "Text 555.555.5555"
 * / "Text (555) 555-5555" display text (9 CTAs across both the area and
 * neighborhood branches), the "Reach us at (555) 555-5555..." step copy,
 * and the hero/lifestyle-photo figcaption's "cleaning service by Your
 * Business" all hardcoded the template placeholder regardless of tenant.
 * Fixed by threading `config`/`brand` (already resolved once per request)
 * into every one of these.
 */

let siteConfigName = 'Sparkle Cleaning Co'
let siteConfigPhone = '(646) 555-0199'
let siteConfigPhoneDigits = '6465550199'

vi.mock('@/app/site/template/_config/load', () => ({
  getSiteConfig: async () => ({
    identity: { name: siteConfigName, url: 'https://a-tenant.example.com', siteName: siteConfigName, legalName: null, foundedYear: 2020, logo: undefined },
    contact: { phone: siteConfigPhone, phoneDigits: siteConfigPhoneDigits, email: 'hello@a-tenant.example.com', supportPhone: siteConfigPhone, supportPhoneDigits: siteConfigPhoneDigits },
    geo: { placename: 'New York', region: 'US-NY', lat: 40.7, lng: -74 },
    theme: { primary: '#000', primaryAlt: '#111' },
    industry: 'cleaning',
    reviewUrl: '/reviews/submit',
  }),
}))

vi.mock('@/lib/seo/overrides', () => ({
  getSeoOverride: async () => null,
}))

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <img alt={props.alt} />,
}))

vi.mock('@/app/site/template/_components/JsonLd', () => ({ default: () => null }))
vi.mock('@/app/site/template/_components/FAQSection', () => ({ default: () => null }))
vi.mock('@/app/site/template/_components/NearbyNeighborhoods', () => ({ default: () => null }))
// CTABlock deliberately NOT mocked — same reasoning as page.homepage-branding.test.tsx.

import SlugPage from './page'

const AREA_SLUG = 'manhattan-maid-service'
const NEIGHBORHOOD_SLUG = 'upper-east-side-maid-service'

beforeEach(() => {
  siteConfigName = 'Sparkle Cleaning Co'
  siteConfigPhone = '(646) 555-0199'
  siteConfigPhoneDigits = '6465550199'
})

describe('site/template [slug] area page — no literal placeholder leaks', () => {
  it('renders the real tenant phone/name, never "Your Business" / "555.555.5555" / "(555) 555-5555"', async () => {
    const element = await SlugPage({ params: Promise.resolve({ slug: AREA_SLUG }) })
    render(element)

    expect(screen.queryByText(/Your Business/)).not.toBeInTheDocument()
    expect(screen.queryByText(/555\.555\.5555/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(555\) 555-5555/)).not.toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(siteConfigPhone.replace(/[()]/g, '\\$&'))).length).toBeGreaterThan(0)

    const smsLinks = screen.getAllByRole('link', { name: /text/i }).filter((el) => el.getAttribute('href')?.startsWith('sms:'))
    expect(smsLinks.length).toBeGreaterThan(0)
    for (const link of smsLinks) {
      expect(link.getAttribute('href')).toBe(`sms:${siteConfigPhoneDigits}`)
    }
  })
})

describe('site/template [slug] neighborhood page — no literal placeholder leaks', () => {
  it('renders the real tenant phone/name, never "Your Business" / "555.555.5555" / "(555) 555-5555"', async () => {
    const element = await SlugPage({ params: Promise.resolve({ slug: NEIGHBORHOOD_SLUG }) })
    render(element)

    expect(screen.queryByText(/Your Business/)).not.toBeInTheDocument()
    expect(screen.queryByText(/555\.555\.5555/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(555\) 555-5555/)).not.toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(siteConfigPhone.replace(/[()]/g, '\\$&'))).length).toBeGreaterThan(0)

    const smsLinks = screen.getAllByRole('link', { name: /text/i }).filter((el) => el.getAttribute('href')?.startsWith('sms:'))
    expect(smsLinks.length).toBeGreaterThan(0)
    for (const link of smsLinks) {
      expect(link.getAttribute('href')).toBe(`sms:${siteConfigPhoneDigits}`)
    }
  })

  it('wrong-tenant probe: tenant B\'s phone never leaks into tenant A\'s neighborhood page', async () => {
    const elementA = await SlugPage({ params: Promise.resolve({ slug: NEIGHBORHOOD_SLUG }) })
    const { unmount } = render(elementA)
    expect(screen.getAllByText(new RegExp(siteConfigPhone.replace(/[()]/g, '\\$&'))).length).toBeGreaterThan(0)
    unmount()

    siteConfigName = 'Totally Different Tenant'
    siteConfigPhone = '(212) 555-0177'
    siteConfigPhoneDigits = '2125550177'
    const elementB = await SlugPage({ params: Promise.resolve({ slug: NEIGHBORHOOD_SLUG }) })
    render(elementB)
    expect(screen.queryByText(/\(646\) 555-0199/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/\(212\) 555-0177/).length).toBeGreaterThan(0)
  })
})
