import { faqSchema, breadcrumbSchema, webPageSchema } from '../seo/schema'
import { SERVICES } from '../seo/services'
import { EMD_CITY_PHOTOS } from './photos'
import type { EmdMicrositeConfig } from './types'

const PARENT_BUSINESS = {
  name: 'The Florida Maid',
  url: 'https://www.thefloridamaid.com',
  phone: '+1-954-710-3636',
  email: 'hi@thefloridamaid.com',
  logo: 'https://www.thefloridamaid.com/sites/the-florida-maid/icon-512.png',
}

/** Reviews visible on the page (see EmdMicrositeConfig.testimonials) — the AggregateRating/Review schema below mirrors these 1:1 so it never claims more than what's actually shown. */
function emdReviewSchemas(config: EmdMicrositeConfig, businessUrl: string) {
  return config.testimonials.map(t => ({
    '@type': 'Review',
    itemReviewed: { '@type': 'LocalBusiness', '@id': `${businessUrl}/#business` },
    reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1 },
    author: { '@type': 'Person', name: t.name },
    reviewBody: t.text,
  }))
}

function emdLocalBusinessSchema(config: EmdMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness', 'HousekeepingService'],
    '@id': `${url}/#business`,
    name: config.brandName,
    alternateName: 'A Florida Maid Services Company',
    url,
    telephone: PARENT_BUSINESS.phone,
    email: PARENT_BUSINESS.email,
    description: config.metaDescription,
    logo: PARENT_BUSINESS.logo,
    // Only assert a real, location-verified photo as the business's `image` —
    // the 17 cities running the generic clean-home fallback (no confident
    // Pexels match) keep the logo here instead, since that photo doesn't
    // actually depict this city.
    image: EMD_CITY_PHOTOS[config.domain]?.realLocation ? EMD_CITY_PHOTOS[config.domain].src : PARENT_BUSINESS.logo,
    priceRange: '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Credit Card, Debit Card, Zelle, Venmo, Apple Pay',
    knowsLanguage: ['en', 'es'],
    brand: { '@type': 'Brand', name: 'The Florida Maid' },
    parentOrganization: { '@type': 'Organization', '@id': `${PARENT_BUSINESS.url}/#organization` },
    geo: { '@type': 'GeoCoordinates', latitude: config.geo.lat, longitude: config.geo.lng },
    areaServed: [
      { '@type': 'Place', name: config.city },
      { '@type': 'State', name: 'Florida' },
    ],
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '07:00', closes: '19:00' },
    ],
    // Mirrors the "5.0 on Google" claim already shown in the hero social-proof
    // bar — the parent Florida Maid brand's real rating, not fabricated for
    // this microsite. reviewCount reflects only the testimonials actually
    // displayed on this page, not an invented larger number.
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      bestRating: '5',
      worstRating: '1',
      reviewCount: config.testimonials.length,
    },
    review: emdReviewSchemas(config, url),
    makesOffer: [
      { '@type': 'Offer', name: 'Client Supplies & Equipment', priceSpecification: { '@type': 'UnitPriceSpecification', price: '49.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' } },
      { '@type': 'Offer', name: 'We Bring Everything', priceSpecification: { '@type': 'UnitPriceSpecification', price: '59.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' } },
      { '@type': 'Offer', name: 'Same-Day / Emergency', priceSpecification: { '@type': 'UnitPriceSpecification', price: '89.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' } },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Cleaning Services in ${config.city}`,
      itemListElement: SERVICES.map(s => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', '@id': `${url}/#service-${s.slug}` },
      })),
    },
    sameAs: [PARENT_BUSINESS.url],
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${PARENT_BUSINESS.url}/book-now`, actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'] },
      result: { '@type': 'Reservation', name: 'Book Cleaning Service' },
    },
  }
}

/** One Service entity per row in the on-page Services accordion — same name/description/price/features shown there, nothing invented. */
function emdServiceSchemas(config: EmdMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return SERVICES.map(s => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}/#service-${s.slug}`,
    name: `${s.name} in ${config.city}, FL`,
    description: s.description,
    provider: { '@type': 'LocalBusiness', '@id': `${url}/#business` },
    areaServed: { '@type': 'Place', name: config.city },
    serviceType: s.name,
    category: 'House Cleaning',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${s.name} Features`,
      itemListElement: s.features.map(f => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: f } })),
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: s.priceRange,
      availability: 'https://schema.org/InStock',
      areaServed: { '@type': 'Place', name: config.city },
    },
  }))
}

/** Mirrors the on-page "How to Book a House Cleaning" steps exactly. */
function emdHowToSchema(config: EmdMicrositeConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Book a House Cleaning in ${config.city}`,
    description: `Booking a cleaning with ${config.brandName} in ${config.city}, FL takes minutes.`,
    step: config.firstVisitSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: s,
    })),
  }
}

/** Lightweight Organization entity for the microsite brand itself, distinct from the parent Florida Maid Organization. */
function emdOrganizationSchema(config: EmdMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}/#organization`,
    name: config.brandName,
    alternateName: 'A Florida Maid Services Company',
    url,
    logo: PARENT_BUSINESS.logo,
    parentOrganization: { '@type': 'Organization', name: PARENT_BUSINESS.name, url: PARENT_BUSINESS.url },
    email: PARENT_BUSINESS.email,
    telephone: PARENT_BUSINESS.phone,
  }
}

/** taggedFaqs: same FAQ content already run through the page's brand-tagging helper, so the FAQPage schema matches the visible copy exactly. */
export function emdMicrositeSchemas(config: EmdMicrositeConfig, taggedFaqs: { question: string; answer: string }[]) {
  const url = `https://www.${config.domain}`
  return [
    emdOrganizationSchema(config),
    emdLocalBusinessSchema(config),
    webPageSchema({
      url,
      name: config.metaTitle,
      description: config.metaDescription,
      breadcrumb: [{ name: 'Home', url }],
    }),
    breadcrumbSchema([{ name: 'Home', url }]),
    ...emdServiceSchemas(config),
    emdHowToSchema(config),
    faqSchema(taggedFaqs),
  ]
}
