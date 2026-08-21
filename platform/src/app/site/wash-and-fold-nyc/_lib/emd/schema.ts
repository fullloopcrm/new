import { SERVICES } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import { PARENT_TAG, PARENT_BRAND_NAME, SITE_URL, EMAIL, BOOK_URL } from './shared-content'
import type { WashFoldMicrositeConfig, LocalFAQ } from './types'

function emdOrganizationSchema(config: WashFoldMicrositeConfig) {
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
    telephone: '+1-917-970-6002',
  }
}

function emdLocalBusinessSchema(config: WashFoldMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'DryCleaningOrLaundry'],
    '@id': `${url}/#business`,
    name: config.brandName,
    alternateName: PARENT_TAG,
    url,
    telephone: '+1-917-970-6002',
    email: EMAIL,
    description: config.metaDescription,
    priceRange: '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Credit Card, Debit Card, Zelle, Venmo, Apple Pay',
    brand: { '@type': 'Brand', name: PARENT_BRAND_NAME },
    parentOrganization: { '@type': 'Organization', '@id': `${SITE_URL}/#organization` },
    geo: { '@type': 'GeoCoordinates', latitude: config.geo.lat, longitude: config.geo.lng },
    areaServed: [
      { '@type': 'Place', name: config.areaName },
      { '@type': 'Place', name: config.borough },
      { '@type': 'City', name: 'New York' },
    ],
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '07:00', closes: '21:00' },
    ],
    makesOffer: {
      '@type': 'Offer',
      name: 'Wash & Fold Laundry Service',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: '3.00', priceCurrency: 'USD', unitCode: 'LBR', unitText: 'per pound, $39 minimum' },
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Laundry Services in ${config.areaName}`,
      itemListElement: SERVICES.map(s => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', '@id': `${url}/#service-${s.slug}` },
      })),
    },
    sameAs: [SITE_URL],
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: BOOK_URL, actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'] },
      result: { '@type': 'Reservation', name: 'Book Wash & Fold Pickup' },
    },
  }
}

function emdServiceSchemas(config: WashFoldMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return SERVICES.map(s => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}/#service-${s.slug}`,
    name: `${s.name} in ${config.areaName}, NYC`,
    description: s.description,
    provider: { '@type': 'LocalBusiness', '@id': `${url}/#business` },
    areaServed: { '@type': 'Place', name: config.areaName },
    serviceType: s.name,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: s.priceRange,
      availability: 'https://schema.org/InStock',
      areaServed: { '@type': 'Place', name: config.areaName },
    },
  }))
}

function emdBreadcrumbSchema(config: WashFoldMicrositeConfig) {
  const url = `https://www.${config.domain}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: url }],
  }
}

function emdWebPageSchema(config: WashFoldMicrositeConfig) {
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
export function washFoldMicrositeSchemas(config: WashFoldMicrositeConfig, allFaqs: LocalFAQ[]) {
  return [
    emdOrganizationSchema(config),
    emdLocalBusinessSchema(config),
    emdWebPageSchema(config),
    emdBreadcrumbSchema(config),
    ...emdServiceSchemas(config),
    emdFaqSchema(allFaqs),
  ]
}
