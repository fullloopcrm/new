import { describe, it, expect } from 'vitest'
import { neighborhoodServiceContent, serviceContent, neighborhoodFAQs, commonServiceFAQs, getServiceRichContent } from './content'
import { getArea, getNeighborhood } from './locations'
import { getService } from './services'
import type { BrandContext } from './brand'

/**
 * content.ts un-parameterized-function bug-class probe.
 *
 * BUG (fixed here): `neighborhoodServiceContent`, `serviceContent`,
 * `neighborhoodFAQs`, and `commonServiceFAQs` took no `brand` parameter at
 * all — every call site rendered the literal "Your Business" / "(555)
 * 555-5555" / "example.com" placeholder regardless of tenant. Same for
 * `getServiceRichContent`'s static `richContentMap` (2 phone-number
 * literals in one service's nycTips/faqs). Fixed by threading an optional
 * `brand: BrandContext = DEFAULT_BRAND` through each (same incremental
 * migration pattern as homepageContent/areaContent/neighborhoodContent).
 */

const neighborhood = getNeighborhood('upper-east-side')!
const area = getArea('manhattan')!
const service = getService('deep-cleaning')!

const brandA: BrandContext = {
  name: 'Sparkle Cleaning Co', siteName: 'Sparkle Cleaning Co', url: 'https://sparkle.example.com',
  phone: '(646) 555-0199', phoneDigits: '6465550199', city: 'New York City', region: 'US-NY', industry: 'cleaning',
}
const brandB: BrandContext = {
  name: 'Totally Different Tenant', siteName: 'Totally Different Tenant', url: 'https://different.example.com',
  phone: '(212) 555-0177', phoneDigits: '2125550177', city: 'New York City', region: 'US-NY', industry: 'cleaning',
}

describe('neighborhoodServiceContent()', () => {
  it('interpolates the real brand, never the placeholder', () => {
    const content = neighborhoodServiceContent(neighborhood, service, area, brandA)
    expect(content.metaDescription).toContain('(646) 555-0199')
    expect(content.metaDescription).not.toContain('(555) 555-5555')
    expect(content.intro).not.toContain('Your Business')
  })

  it('wrong-tenant probe: brand B never leaks into brand A\'s content', () => {
    const contentA = neighborhoodServiceContent(neighborhood, service, area, brandA)
    expect(contentA.metaDescription).not.toContain('(212) 555-0177')
    const contentB = neighborhoodServiceContent(neighborhood, service, area, brandB)
    expect(contentB.metaDescription).toContain('(212) 555-0177')
    expect(contentB.metaDescription).not.toContain('(646) 555-0199')
  })
})

describe('serviceContent()', () => {
  it('interpolates the real phone, never "(555) 555-5555"', () => {
    const content = serviceContent(service, brandA)
    expect(content.metaDescription).toContain('(646) 555-0199')
    expect(content.metaDescription).not.toContain('(555) 555-5555')
  })
})

describe('neighborhoodFAQs()', () => {
  it('interpolates the real phone, never "(555) 555-5555"', () => {
    const faqs = neighborhoodFAQs(neighborhood, area, brandA)
    const joined = faqs.map((f) => f.answer).join(' ')
    expect(joined).toContain('(646) 555-0199')
    expect(joined).not.toContain('(555) 555-5555')
  })
})

describe('commonServiceFAQs()', () => {
  it('interpolates the real phone/name/url, never the placeholders', () => {
    const faqs = commonServiceFAQs(service, brandA)
    const joined = faqs.map((f) => f.answer).join(' ')
    expect(joined).toContain('(646) 555-0199')
    expect(joined).toContain('Sparkle Cleaning Co')
    expect(joined).toContain('sparkle.example.com')
    expect(joined).not.toContain('(555) 555-5555')
    expect(joined).not.toContain('Your Business')
    expect(joined).toContain('sparkle.example.com/referral')
    expect(joined).not.toContain('Visit example.com/referral')
  })

  it('wrong-tenant probe: brand B\'s phone never leaks into brand A\'s FAQs', () => {
    const faqsA = commonServiceFAQs(service, brandA).map((f) => f.answer).join(' ')
    const faqsB = commonServiceFAQs(service, brandB).map((f) => f.answer).join(' ')
    expect(faqsA).not.toContain('(212) 555-0177')
    expect(faqsB).not.toContain('(646) 555-0199')
    expect(faqsB).toContain('Totally Different Tenant')
  })
})

describe('getServiceRichContent()', () => {
  it('interpolates the real phone into same-day-cleaning\'s nycTips/faqs, never "(555) 555-5555"', () => {
    const rich = getServiceRichContent('same-day-cleaning', brandA)
    expect(rich).not.toBeNull()
    const serialized = JSON.stringify(rich)
    expect(serialized).toContain('(646) 555-0199')
    expect(serialized).not.toContain('(555) 555-5555')
  })

  it('defaults to the placeholder-bearing content when no brand is passed (incremental-migration safe default)', () => {
    const rich = getServiceRichContent('same-day-cleaning')
    expect(JSON.stringify(rich)).toContain('(555) 555-5555')
  })

  it('returns null for an unknown slug regardless of brand', () => {
    expect(getServiceRichContent('not-a-real-service', brandA)).toBeNull()
  })
})
