import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * site/template homepage — client-facing literal-placeholder probe.
 *
 * BUG (fixed here): the cleaning-editorial homepage (the branch every
 * cleaning-industry template tenant actually renders) hardcoded "Your
 * Business" / "555.555.5555" / "(555) 555-5555" / "hi@example.com" in ~24
 * places: the `testimonials` and `homepageFAQs` module-level consts (never
 * threaded any config), the hero/CTA "Text 555.555.5555" buttons (whose
 * `sms:` href was already correctly wired to the real phone — only the
 * displayed text was fake), photo alt/caption text, half a dozen section
 * headers, and four of the inline "fake Google review" cards. Every real
 * end user (prospect, reviewer) saw these regardless of which tenant's site
 * they were on. Fixed by threading `siteConfig` through every one of these
 * — `testimonials`/`homepageFAQs` converted from consts to functions that
 * take `SiteConfig`, and every hardcoded literal in the JSX replaced with
 * the real `siteConfig.identity.name` / `.contact.phone` / `.contact.email`.
 */

let siteConfigName = 'Tenant A Cleaning'
let siteConfigPhone = '(212) 555-0100'
let siteConfigPhoneDigits = '2125550100'
let siteConfigEmail = 'hello@tenant-a.example.com'

vi.mock('@/app/site/template/_config/load', () => ({
  getSiteConfig: async () => ({
    identity: { name: siteConfigName, url: 'https://a-tenant.example.com', siteName: siteConfigName, legalName: null, foundedYear: 2020, logo: undefined },
    contact: { phone: siteConfigPhone, phoneDigits: siteConfigPhoneDigits, email: siteConfigEmail, supportPhone: siteConfigPhone, supportPhoneDigits: siteConfigPhoneDigits },
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
vi.mock('@/app/site/template/_components/ServiceGrid', () => ({ default: () => null }))
vi.mock('@/app/site/template/_components/TrustBadges', () => ({ default: () => null }))
vi.mock('@/app/site/template/_components/FAQSection', () => ({ default: () => null }))
vi.mock('@/app/site/template/_components/VideoReviews', () => ({ default: () => null }))
vi.mock('@/app/site/template/_components/GenericHome', () => ({ default: () => null }))
vi.mock('@/app/site/template/_components/VirtualAssistantLanding', () => ({ default: () => null }))
// CTABlock deliberately NOT mocked — it's a shared component with its own
// phone-prop rendering (the "Text {phone}" CTA), and the full-render test
// below should catch a regression there too, not just inside page.tsx's own JSX.

import HomePage, { testimonials, homepageFAQs } from './page'

const baseConfig = {
  identity: { name: 'Sparkle Cleaning Co', url: 'https://sparkle.example.com', siteName: 'Sparkle Cleaning Co' },
  contact: { phone: '(646) 555-0199', phoneDigits: '6465550199', email: 'hello@sparkle.example.com' },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

beforeEach(() => {
  siteConfigName = 'Tenant A Cleaning'
  siteConfigPhone = '(212) 555-0100'
  siteConfigPhoneDigits = '2125550100'
  siteConfigEmail = 'hello@tenant-a.example.com'
})

describe('site/template homepage — testimonials() / homepageFAQs() engines', () => {
  it('testimonials() interpolates the real tenant name, never "Your Business"', () => {
    const result = testimonials(baseConfig)
    const joined = result.map((t) => t.text).join(' ')
    expect(joined).toContain('Sparkle Cleaning Co')
    expect(joined).not.toContain('Your Business')
  })

  it('homepageFAQs() interpolates the real phone/name/email, never the placeholders', () => {
    const result = homepageFAQs(baseConfig)
    const joined = result.map((f) => f.answer).join(' ')
    expect(joined).toContain('(646) 555-0199')
    expect(joined).toContain('hello@sparkle.example.com')
    expect(joined).toContain('Sparkle Cleaning Co')
    expect(joined).not.toContain('(555) 555-5555')
    expect(joined).not.toContain('Your Business')
    expect(joined).not.toContain('hi@example.com')
  })

  it('wrong-tenant probe: tenant B\'s name/phone never leak into tenant A\'s testimonials/FAQs', () => {
    const tenantA = { identity: { name: 'Tenant A', url: 'https://a.example.com' }, contact: { phone: '(111) 111-1111', phoneDigits: '1111111111', email: 'a@example.com' } } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const tenantB = { identity: { name: 'Tenant B', url: 'https://b.example.com' }, contact: { phone: '(222) 222-2222', phoneDigits: '2222222222', email: 'b@example.com' } } as any // eslint-disable-line @typescript-eslint/no-explicit-any

    const faqsA = homepageFAQs(tenantA).map((f) => f.answer).join(' ')
    const faqsB = homepageFAQs(tenantB).map((f) => f.answer).join(' ')

    expect(faqsA).not.toContain('Tenant B')
    expect(faqsA).not.toContain('(222) 222-2222')
    expect(faqsB).not.toContain('Tenant A')
    expect(faqsB).not.toContain('(111) 111-1111')
  })
})

describe('site/template homepage — full render, no literal placeholder leaks', () => {
  it('renders the real tenant name/phone everywhere, never "Your Business" / "555.555.5555" / "(555) 555-5555" / "hi@example.com"', async () => {
    const element = await HomePage()
    render(element)

    expect(screen.queryByText(/Your Business/)).not.toBeInTheDocument()
    expect(screen.queryByText(/555\.555\.5555/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(555\) 555-5555/)).not.toBeInTheDocument()
    expect(screen.queryByText(/hi@example\.com/)).not.toBeInTheDocument()

    expect(screen.getAllByText(new RegExp(siteConfigName)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(siteConfigPhone.replace(/[()]/g, '\\$&'))).length).toBeGreaterThan(0)

    // Both the reviews-widget and CTABlock "Write a Review" links must use
    // the resolved per-tenant reviewUrl, never nycmaid's own hardcoded
    // Google listing.
    const writeReviewLinks = screen.getAllByRole('link', { name: /write a review/i })
    expect(writeReviewLinks.length).toBeGreaterThan(0)
    for (const link of writeReviewLinks) {
      expect(link.getAttribute('href')).toBe('/reviews/submit')
      expect(link.getAttribute('href')).not.toContain('g.page')
    }
  })

  it('wrong-tenant probe: rendering for tenant B never shows tenant A\'s name', async () => {
    const elementA = await HomePage()
    const { unmount } = render(elementA)
    expect(screen.getAllByText(new RegExp(siteConfigName)).length).toBeGreaterThan(0)
    unmount()

    siteConfigName = 'Totally Different Tenant'
    siteConfigPhone = '(646) 555-9999'
    const elementB = await HomePage()
    render(elementB)
    expect(screen.queryByText(/Tenant A Cleaning/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Totally Different Tenant/).length).toBeGreaterThan(0)
  })
})
