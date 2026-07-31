import { faqSchema, breadcrumbSchema, webPageSchema } from '../seo/schema'
import type { EmdMicrositeConfig } from './types'

const PARENT_BUSINESS = {
  name: 'The Florida Maid',
  url: 'https://www.thefloridamaid.com',
  phone: '+1-954-710-3636',
  email: 'hi@thefloridamaid.com',
  logo: 'https://www.thefloridamaid.com/sites/the-florida-maid/icon-512.png',
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
    image: PARENT_BUSINESS.logo,
    priceRange: '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Credit Card, Debit Card, Zelle, Venmo, Apple Pay',
    knowsLanguage: ['en', 'es'],
    brand: { '@type': 'Brand', name: 'The Florida Maid' },
    parentOrganization: { '@type': 'Organization', name: PARENT_BUSINESS.name, url: PARENT_BUSINESS.url },
    geo: { '@type': 'GeoCoordinates', latitude: config.geo.lat, longitude: config.geo.lng },
    areaServed: [
      { '@type': 'Place', name: config.city },
      { '@type': 'State', name: 'Florida' },
    ],
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '07:00', closes: '19:00' },
    ],
    makesOffer: [
      { '@type': 'Offer', name: 'Client Supplies & Equipment', priceSpecification: { '@type': 'UnitPriceSpecification', price: '49.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' } },
      { '@type': 'Offer', name: 'We Bring Everything', priceSpecification: { '@type': 'UnitPriceSpecification', price: '59.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' } },
      { '@type': 'Offer', name: 'Same-Day / Emergency', priceSpecification: { '@type': 'UnitPriceSpecification', price: '89.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' } },
    ],
    sameAs: [PARENT_BUSINESS.url],
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${PARENT_BUSINESS.url}/book-now`, actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'] },
      result: { '@type': 'Reservation', name: 'Book Cleaning Service' },
    },
  }
}

/** taggedFaqs: same FAQ content already run through the page's brand-tagging helper, so the FAQPage schema matches the visible copy exactly. */
export function emdMicrositeSchemas(config: EmdMicrositeConfig, taggedFaqs: { question: string; answer: string }[]) {
  const url = `https://www.${config.domain}`
  return [
    emdLocalBusinessSchema(config),
    webPageSchema({
      url,
      name: config.metaTitle,
      description: config.metaDescription,
      breadcrumb: [{ name: 'Home', url }],
    }),
    breadcrumbSchema([{ name: 'Home', url }]),
    faqSchema(taggedFaqs),
  ]
}
