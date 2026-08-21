import { getAllServices } from '../data'
import { PARENT_TAG, PARENT_BRAND_NAME, SITE_URL, PHONE_DISPLAY, EMAIL, QUOTE_URL } from './shared-content'
import type { NeighborhoodMicrositeConfig, LocalFAQ } from './types'

function emdOrganizationSchema(config: NeighborhoodMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}/#organization`,
    name: config.brandName,
    alternateName: PARENT_TAG,
    url,
    parentOrganization: { '@type': 'Organization', name: PARENT_BRAND_NAME, url: SITE_URL },
    email: EMAIL,
    telephone: '+1-212-202-8545',
  }
}

function emdLocalBusinessSchema(config: NeighborhoodMicrositeConfig) {
  const url = `https://www.${config.domain}`
  const services = getAllServices()
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': `${url}/#business`,
    name: config.brandName,
    alternateName: PARENT_TAG,
    url,
    telephone: '+1-212-202-8545',
    email: EMAIL,
    description: config.metaDescription,
    priceRange: '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Credit Card, Debit Card, Check, Bank Transfer',
    brand: { '@type': 'Brand', name: PARENT_BRAND_NAME },
    parentOrganization: { '@type': 'Organization', '@id': `${SITE_URL}/#organization` },
    geo: { '@type': 'GeoCoordinates', latitude: config.geo.lat, longitude: config.geo.lng },
    areaServed: [
      { '@type': 'Place', name: config.neighborhoodName },
      { '@type': 'Place', name: config.borough },
      { '@type': 'City', name: 'New York' },
    ],
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
    ],
    makesOffer: {
      '@type': 'Offer',
      name: 'Pest Control Treatment',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: '199.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour, 1-hour minimum' },
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Pest Control Services in ${config.neighborhoodName}`,
      itemListElement: services.map(s => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', '@id': `${url}/#service-${s.slug}` },
      })),
    },
    sameAs: [SITE_URL],
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: QUOTE_URL, actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'] },
      result: { '@type': 'Reservation', name: 'Request Pest Control Quote' },
    },
  }
}

function emdServiceSchemas(config: NeighborhoodMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return getAllServices().map(s => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}/#service-${s.slug}`,
    name: `${s.name} in ${config.neighborhoodName}, NYC`,
    description: s.description,
    provider: { '@type': 'LocalBusiness', '@id': `${url}/#business` },
    areaServed: { '@type': 'Place', name: config.neighborhoodName },
    serviceType: s.name,
    category: s.category,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${s.name} — What's Included`,
      itemListElement: s.commonServices.map(f => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: f } })),
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: s.priceRange,
      availability: 'https://schema.org/InStock',
      areaServed: { '@type': 'Place', name: config.neighborhoodName },
    },
  }))
}

function emdBreadcrumbSchema(config: NeighborhoodMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: url }],
  }
}

function emdWebPageSchema(config: NeighborhoodMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}/#webpage`,
    url,
    name: config.metaTitle,
    description: config.metaDescription,
    isPartOf: { '@type': 'WebSite', name: config.brandName, url },
    about: { '@type': 'LocalBusiness', '@id': `${url}/#business` },
  }
}

function emdFaqSchema(faqs: LocalFAQ[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

/** allFaqs: local + general FAQs, already combined in display order so the FAQPage schema matches the visible page 1:1. */
export function neighborhoodMicrositeSchemas(config: NeighborhoodMicrositeConfig, allFaqs: LocalFAQ[]) {
  return [
    emdOrganizationSchema(config),
    emdLocalBusinessSchema(config),
    emdWebPageSchema(config),
    emdBreadcrumbSchema(config),
    ...emdServiceSchemas(config),
    emdFaqSchema(allFaqs),
  ]
}
