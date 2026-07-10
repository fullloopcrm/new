import type { SiteConfig } from '../../_config/types'
import type { Neighborhood } from './locations'
import type { Service } from './services'
import type { Area } from './data/areas'
import { SERVICES } from './services'
import { AREAS } from './data/areas'

/**
 * Config-driven structured data.
 *
 * Every schema function takes a `Biz` built from the tenant's SiteConfig via
 * buildBusiness(config), so a tenant's JSON-LD carries ITS OWN name, URL, phone,
 * email, geo and logo — never a placeholder or another business's data.
 *
 * Deliberately NOT emitted: individual customer reviews and aggregateRating.
 * SiteConfig has no per-tenant verified reviews, and emitting reviews a tenant
 * did not actually receive is fake-review markup (Google penalty + deceptive).
 * The cleaning offer catalog / service + area lists are cleaning-domain content
 * (these functions run only on the cleaning-gated template pages).
 */

export interface Biz {
  name: string
  legalName: string
  url: string
  phone: string
  phoneDisplay: string
  email: string
  logo?: string
  placename: string
  region: string
  lat: number
  lng: number
  foundingDate?: string
  description: string
}

/** State code from an ISO region like "US-NY" → "NY". */
function regionCode(region: string): string {
  const parts = region.split('-')
  return parts[parts.length - 1] || region
}

export function buildBusiness(config: SiteConfig): Biz {
  const url = config.identity.url.replace(/\/+$/, '')
  const digits = (config.contact.phoneDigits || '').replace(/\D/g, '')
  const logoPath = config.identity.logo
  return {
    name: config.identity.name,
    legalName: config.identity.legalName ?? config.identity.name,
    url,
    phone: digits ? `+1-${digits}` : '',
    phoneDisplay: config.contact.phone,
    email: config.contact.email,
    logo: logoPath ? `${url}${logoPath.startsWith('/') ? '' : '/'}${logoPath}` : undefined,
    placename: config.geo.placename,
    region: regionCode(config.geo.region),
    lat: config.geo.lat,
    lng: config.geo.lng,
    foundingDate: config.identity.foundedYear ? String(config.identity.foundedYear) : undefined,
    description: `${config.identity.name} provides professional service in ${config.geo.placename}.`,
  }
}

// ============ REUSABLE REFERENCES (per-biz) ============

function addressObj(b: Biz) {
  return {
    '@type': 'PostalAddress' as const,
    addressLocality: b.placename,
    addressRegion: b.region,
    addressCountry: 'US',
  }
}

function geoObj(b: Biz) {
  return { '@type': 'GeoCoordinates' as const, latitude: b.lat, longitude: b.lng }
}

function logoObj(b: Biz) {
  return b.logo
    ? {
        '@type': 'ImageObject' as const,
        '@id': `${b.url}/#logo`,
        url: b.logo,
        contentUrl: b.logo,
        caption: `${b.name} Logo`,
      }
    : undefined
}

function openingHoursObj() {
  return [
    { '@type': 'OpeningHoursSpecification' as const, dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '07:00', closes: '19:00' },
  ]
}

function contactPoints(b: Biz) {
  const points: Record<string, unknown>[] = []
  if (b.phone) {
    points.push(
      { '@type': 'ContactPoint', telephone: b.phone, contactType: 'customer service', areaServed: 'US', availableLanguage: ['English', 'Spanish'] },
      { '@type': 'ContactPoint', telephone: b.phone, contactType: 'reservations', areaServed: 'US', availableLanguage: ['English', 'Spanish'] },
    )
  }
  if (b.email) {
    points.push({ '@type': 'ContactPoint', email: b.email, contactType: 'customer support', areaServed: 'US', availableLanguage: ['English', 'Spanish'] })
  }
  return points
}

function areaServedObj(b: Biz) {
  return [{ '@type': 'Place' as const, name: b.placename }]
}

function serviceAreaObj(b: Biz) {
  return {
    '@type': 'GeoCircle' as const,
    geoMidpoint: { '@type': 'GeoCoordinates' as const, latitude: b.lat, longitude: b.lng },
    geoRadius: '80000',
  }
}

// Provider shorthand
function providerRef(b: Biz) {
  return { '@type': 'LocalBusiness' as const, '@id': `${b.url}/#business`, name: b.name }
}
function orgRef(b: Biz) {
  return { '@id': `${b.url}/#organization` }
}
function siteRef(b: Biz) {
  return { '@id': `${b.url}/#website` }
}
function businessRef(b: Biz) {
  return { '@id': `${b.url}/#business` }
}

// ================================================================
// ORGANIZATION
// ================================================================

export function organizationSchema(b: Biz) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${b.url}/#organization`,
    name: b.name,
    legalName: b.legalName,
    url: b.url,
    ...(logoObj(b) ? { logo: logoObj(b) } : {}),
    ...(b.logo ? { image: [b.logo] } : {}),
    ...(b.email ? { email: b.email } : {}),
    ...(b.phone ? { telephone: b.phone } : {}),
    description: b.description,
    ...(b.foundingDate ? { foundingDate: b.foundingDate } : {}),
    address: addressObj(b),
    contactPoint: contactPoints(b),
    areaServed: areaServedObj(b),
    brand: {
      '@type': 'Brand',
      name: b.name,
      ...(b.logo ? { logo: b.logo } : {}),
      url: b.url,
    },
  }
}

// ================================================================
// WEBSITE
// ================================================================

export function webSiteSchema(b: Biz) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${b.url}/#website`,
    name: b.name,
    url: b.url,
    description: b.description,
    publisher: orgRef(b),
    inLanguage: 'en-US',
  }
}

// ================================================================
// WEBPAGE
// ================================================================

export function webPageSchema(b: Biz, opts: {
  url: string
  name: string
  description: string
  type?: string
  datePublished?: string
  dateModified?: string
  breadcrumb?: { name: string; url: string }[]
  speakable?: string[]
  primaryImageOfPage?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': opts.type || 'WebPage',
    '@id': `${opts.url}/#webpage`,
    url: opts.url,
    name: opts.name,
    description: opts.description,
    isPartOf: siteRef(b),
    about: businessRef(b),
    publisher: orgRef(b),
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    inLanguage: 'en-US',
    ...(opts.primaryImageOfPage ? {
      primaryImageOfPage: { '@type': 'ImageObject', url: opts.primaryImageOfPage },
    } : {}),
    ...(opts.speakable ? {
      speakable: { '@type': 'SpeakableSpecification', cssSelector: opts.speakable },
    } : {}),
    ...(opts.breadcrumb ? {
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: opts.breadcrumb.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      },
    } : {}),
    potentialAction: { '@type': 'ReadAction', target: opts.url },
  }
}

// ================================================================
// LOCAL BUSINESS
// ================================================================

export function localBusinessSchema(b: Biz, neighborhood?: Neighborhood, area?: Area) {
  const areaServed = neighborhood
    ? [
        { '@type': 'Place' as const, name: `${neighborhood.name}${area ? `, ${area.name}` : ''}` },
        ...(area ? [{ '@type': 'Place' as const, name: area.name }] : []),
        { '@type': 'Place' as const, name: b.placename },
      ]
    : areaServedObj(b)

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness', 'HousekeepingService'],
    '@id': `${b.url}/#business`,
    name: b.name,
    legalName: b.legalName,
    url: b.url,
    ...(b.phone ? { telephone: b.phone } : {}),
    ...(b.email ? { email: b.email } : {}),
    description: b.description,
    ...(logoObj(b) ? { logo: logoObj(b) } : {}),
    ...(b.logo ? { image: b.logo } : {}),
    priceRange: '$$',
    ...(b.foundingDate ? { foundingDate: b.foundingDate } : {}),
    address: addressObj(b),
    geo: neighborhood
      ? { '@type': 'GeoCoordinates', latitude: neighborhood.lat, longitude: neighborhood.lng }
      : geoObj(b),
    areaServed,
    serviceArea: serviceAreaObj(b),
    openingHoursSpecification: openingHoursObj(),
    contactPoint: contactPoints(b),
    potentialAction: [
      {
        '@type': 'ReserveAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${b.url}/contact`,
          actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'],
        },
        result: { '@type': 'Reservation', name: `Book ${b.name}` },
      },
    ],
    isAccessibleForFree: false,
  }
}

// ================================================================
// SERVICE
// ================================================================

export function serviceSchema(b: Biz, service: Service, neighborhood?: Neighborhood, area?: Area) {
  const location = neighborhood ? `${neighborhood.name}, ${area?.name || ''}` : b.placename
  const serviceUrl = neighborhood
    ? `${b.url}/${neighborhood.urlSlug}/${service.slug}`
    : `${b.url}/services/${service.urlSlug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${serviceUrl}/#service`,
    name: `${service.name}${neighborhood ? ` in ${neighborhood.name}` : ''}`,
    description: service.description,
    url: serviceUrl,
    provider: providerRef(b),
    brand: { '@type': 'Brand', name: b.name },
    areaServed: neighborhood
      ? { '@type': 'Place', name: location, geo: { '@type': 'GeoCoordinates', latitude: neighborhood.lat, longitude: neighborhood.lng } }
      : areaServedObj(b),
    serviceType: service.name,
    serviceOutput: 'Completed professional service',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${service.name} Features`,
      itemListElement: service.features.map(f => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: f },
      })),
    },
    offers: {
      '@type': 'Offer',
      url: serviceUrl,
      priceCurrency: 'USD',
      price: service.priceRange,
      priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'USD', price: service.priceRange },
      availability: 'https://schema.org/InStock',
      areaServed: { '@type': 'Place', name: location },
      seller: providerRef(b),
    },
    termsOfService: `${b.url}/terms-conditions`,
    audience: { '@type': 'Audience', audienceType: service.idealFor.join(', ') },
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${b.url}/contact`,
        actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'],
      },
      result: { '@type': 'Reservation', name: `Book ${service.name}` },
    },
  }
}

// ================================================================
// FAQ
// ================================================================

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

// ================================================================
// BREADCRUMBS
// ================================================================

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ================================================================
// SITE NAVIGATION
// ================================================================

export function siteNavigationSchema(b: Biz) {
  const pages = [
    ['Contact', '/contact'], ['Services', '/services'], ['Pricing', '/pricing'],
    ['Service Areas', '/service-areas'], ['Reviews', '/reviews'], ['Careers', '/careers'],
    ['FAQ', '/faq'], ['About', '/about'], ['Blog', '/blog'],
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'Main Navigation',
    hasPart: pages.map(([name, path], i) => ({ '@type': 'WebPage', name, url: `${b.url}${path}`, position: i + 1 })),
  }
}

// ================================================================
// ITEM LISTS
// ================================================================

export function serviceItemListSchema(b: Biz) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Services Offered by ${b.name}`,
    numberOfItems: SERVICES.length,
    itemListElement: SERVICES.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      url: `${b.url}/services/${s.urlSlug}`,
      item: {
        '@type': 'Service',
        name: s.name,
        description: s.description,
        provider: providerRef(b),
        offers: { '@type': 'Offer', price: s.priceRange, priceCurrency: 'USD' },
      },
    })),
  }
}

export function areaItemListSchema(b: Biz) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Service Areas Covered by ${b.name}`,
    numberOfItems: AREAS.length,
    itemListElement: AREAS.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: a.name,
      url: `${b.url}/${a.urlSlug}`,
      item: {
        '@type': 'Place',
        name: a.name,
        geo: { '@type': 'GeoCoordinates', latitude: a.lat, longitude: a.lng },
      },
    })),
  }
}

// ================================================================
// HOW TO BOOK
// ================================================================

export function howToBookSchema(b: Biz) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Book ${b.name}`,
    description: 'Book in a few simple steps.',
    totalTime: 'PT5M',
    step: [
      { '@type': 'HowToStep', name: 'Contact Us', text: b.phoneDisplay ? `Text ${b.phoneDisplay} to get started.` : 'Reach out to get started.', url: `${b.url}/contact`, position: 1 },
      { '@type': 'HowToStep', name: 'Tell Us What You Need', text: 'Share your details and we provide a custom quote.', position: 2 },
      { '@type': 'HowToStep', name: 'We Take Care of It', text: 'A vetted professional handles the job on schedule.', position: 3 },
    ],
  }
}

// ================================================================
// PROFESSIONAL SERVICE
// ================================================================

export function professionalServiceSchema(b: Biz, service: Service, neighborhood?: Neighborhood, area?: Area) {
  const location = neighborhood ? `${neighborhood.name}, ${area?.name || ''}` : b.placename
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: `${service.name}${neighborhood ? ` in ${neighborhood.name}` : ''} - ${b.name}`,
    description: service.description,
    url: neighborhood ? `${b.url}/${neighborhood.urlSlug}/${service.slug}` : `${b.url}/services/${service.urlSlug}`,
    ...(b.phone ? { telephone: b.phone } : {}),
    ...(b.email ? { email: b.email } : {}),
    priceRange: service.priceRange,
    address: addressObj(b),
    geo: neighborhood ? { '@type': 'GeoCoordinates', latitude: neighborhood.lat, longitude: neighborhood.lng } : geoObj(b),
    areaServed: { '@type': 'Place', name: location },
    openingHoursSpecification: openingHoursObj(),
    ...(b.logo ? { image: b.logo } : {}),
  }
}

// ================================================================
// COMBINED SCHEMA BUNDLES PER PAGE TYPE
// ================================================================

export function homepageSchemas(b: Biz) {
  const url = b.url
  return [
    organizationSchema(b),
    webSiteSchema(b),
    webPageSchema(b, {
      url,
      name: `${b.name} — ${b.placename}`,
      description: b.description,
      type: 'WebPage',
      speakable: ['h1', '.hero-description'],
      breadcrumb: [{ name: 'Home', url }],
    }),
    localBusinessSchema(b),
    serviceItemListSchema(b),
    areaItemListSchema(b),
    siteNavigationSchema(b),
  ]
}

export function areaPageSchemas(b: Biz, area: Area) {
  const url = `${b.url}/${area.urlSlug}`
  const title = `${area.name} — ${b.name}`
  const description = `Professional service in ${area.name}. ${b.phoneDisplay}`
  return [
    organizationSchema(b),
    webSiteSchema(b),
    webPageSchema(b, {
      url,
      name: title,
      description,
      breadcrumb: [{ name: 'Home', url: b.url }, { name: area.name, url }],
    }),
    localBusinessSchema(b),
    breadcrumbSchema([{ name: 'Home', url: b.url }, { name: area.name, url }]),
    serviceItemListSchema(b),
  ]
}

export function neighborhoodPageSchemas(b: Biz, neighborhood: Neighborhood, area: Area) {
  const url = `${b.url}/${neighborhood.urlSlug}`
  const title = `${neighborhood.name} — ${b.name}`
  const description = `Professional service in ${neighborhood.name}, ${area.name}. ${b.phoneDisplay}`
  return [
    organizationSchema(b),
    webSiteSchema(b),
    webPageSchema(b, {
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: b.url },
        { name: area.name, url: `${b.url}/${area.urlSlug}` },
        { name: neighborhood.name, url },
      ],
    }),
    localBusinessSchema(b, neighborhood, area),
    breadcrumbSchema([
      { name: 'Home', url: b.url },
      { name: area.name, url: `${b.url}/${area.urlSlug}` },
      { name: neighborhood.name, url },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Services in ${neighborhood.name}`,
      numberOfItems: SERVICES.length,
      itemListElement: SERVICES.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: s.name,
        url: `${b.url}/${neighborhood.urlSlug}/${s.slug}`,
      })),
    },
  ]
}

export function neighborhoodServicePageSchemas(b: Biz, neighborhood: Neighborhood, service: Service, area: Area) {
  const url = `${b.url}/${neighborhood.urlSlug}/${service.slug}`
  const title = `${service.name} in ${neighborhood.name}, ${area.name} — ${b.name}`
  const description = `Professional ${service.name.toLowerCase()} in ${neighborhood.name}, ${area.name}. ${service.priceRange}. ${b.phoneDisplay}`
  return [
    organizationSchema(b),
    webSiteSchema(b),
    webPageSchema(b, {
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: b.url },
        { name: area.name, url: `${b.url}/${area.urlSlug}` },
        { name: neighborhood.name, url: `${b.url}/${neighborhood.urlSlug}` },
        { name: service.name, url },
      ],
    }),
    localBusinessSchema(b, neighborhood, area),
    serviceSchema(b, service, neighborhood, area),
    professionalServiceSchema(b, service, neighborhood, area),
    breadcrumbSchema([
      { name: 'Home', url: b.url },
      { name: area.name, url: `${b.url}/${area.urlSlug}` },
      { name: neighborhood.name, url: `${b.url}/${neighborhood.urlSlug}` },
      { name: service.name, url },
    ]),
  ]
}

export function servicePageSchemas(b: Biz, service: Service) {
  const url = `${b.url}/services/${service.urlSlug}`
  const title = `${service.name} — ${b.name}`
  const description = `Professional ${service.name.toLowerCase()} in ${b.placename}. ${service.features.slice(0, 3).join(', ')} & more. ${b.phoneDisplay}`
  return [
    organizationSchema(b),
    webSiteSchema(b),
    webPageSchema(b, {
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: b.url },
        { name: 'Services', url: `${b.url}/services` },
        { name: service.name, url },
      ],
    }),
    localBusinessSchema(b),
    serviceSchema(b, service),
    professionalServiceSchema(b, service),
    breadcrumbSchema([
      { name: 'Home', url: b.url },
      { name: 'Services', url: `${b.url}/services` },
      { name: service.name, url },
    ]),
  ]
}
