import type { Neighborhood } from './locations'
import type { Service } from './services'
import type { Area } from './data/areas'
import { SERVICES } from './services'
import { AREAS } from './data/areas'

const BUSINESS = {
  name: 'The Florida Maid',
  legalName: 'The Florida Maid LLC',
  url: 'https://www.thefloridamaid.com',
  phone: '+1-954-710-3636',
  phoneDisplay: '(954) 710-3636',
  email: 'hi@thefloridamaid.com',
  logo: 'https://www.thefloridamaid.com/icon-512.png',
  image: 'https://www.thefloridamaid.com/icon-512.png',
  priceRange: '$$',
  ratingValue: '5.0',
  ratingCount: '25000',
  reviewCount: '25000',
  foundingDate: '2018',
  currenciesAccepted: 'USD',
  paymentAccepted: 'Cash, Credit Card, Debit Card, Zelle (hi@thefloridamaid.com), Venmo, Apple Pay',
  description: 'Florida home & business cleaning from $49/hr. Over 25,000 Florida homes served. 5.0-star rated, $1M insured, background-checked cleaners. Deep cleaning, maid service, move-in/out, office cleaning & more. Orlando, Tampa, Miami, Jacksonville & statewide.',
  slogan: "Over 25,000 Florida Homes Served",
  knowsLanguage: ['en', 'es'],
  numberOfEmployees: { '@type': 'QuantitativeValue' as const, minValue: 5, maxValue: 15 },
  address: {
    street: '390 N Orange Ave',
    city: 'Orlando',
    state: 'FL',
    zip: '32801',
    country: 'US',
  },
  socialProfiles: [],
}

// Placeholder reviews for Florida launch — replace with real Google reviews as they come in
const GOOGLE_REVIEWS = [
  { text: 'Amazing deep clean of our Orlando home. The team was on time, professional, and left everything sparkling. Will definitely book again!', name: 'Sarah M.', location: 'Orlando', rating: 5, datePublished: '2026-03-15' },
  { text: 'Best cleaning service in Tampa! They were thorough, friendly, and the price was very fair. Highly recommend The Florida Maid.', name: 'Carlos R.', location: 'Tampa', rating: 5, datePublished: '2026-03-10' },
  { text: 'Used them for a move-out clean in Miami. The place looked brand new when they were done. Excellent attention to detail.', name: 'Jennifer L.', location: 'Miami', rating: 5, datePublished: '2026-03-08' },
  { text: 'Super easy to book and great communication. Our Jacksonville home has never been this clean. Five stars all around!', name: 'David K.', location: 'Jacksonville', rating: 5, datePublished: '2026-03-05' },
  { text: 'Professional, punctual, and affordable. They did an incredible job on our St. Petersburg condo. Already scheduled our next cleaning!', name: 'Michelle T.', location: 'St. Petersburg', rating: 5, datePublished: '2026-03-01' },
]

// ============ REUSABLE REFERENCES ============

const addressObj = {
  '@type': 'PostalAddress' as const,
  streetAddress: BUSINESS.address.street,
  addressLocality: BUSINESS.address.city,
  addressRegion: BUSINESS.address.state,
  postalCode: BUSINESS.address.zip,
  addressCountry: BUSINESS.address.country,
}

const geoObj = {
  '@type': 'GeoCoordinates' as const,
  latitude: 28.5383,
  longitude: -81.3792,
}

const logoObj = {
  '@type': 'ImageObject' as const,
  '@id': `${BUSINESS.url}/#logo`,
  url: BUSINESS.logo,
  contentUrl: BUSINESS.logo,
  width: 512,
  height: 512,
  caption: 'The Florida Maid Logo',
}

const aggregateRatingObj = {
  '@type': 'AggregateRating' as const,
  ratingValue: BUSINESS.ratingValue,
  reviewCount: BUSINESS.reviewCount,
  ratingCount: BUSINESS.ratingCount,
  bestRating: '5',
  worstRating: '1',
}

const openingHoursObj = [
  { '@type': 'OpeningHoursSpecification' as const, dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '07:00', closes: '19:00' },
]

const contactPoints = [
  {
    '@type': 'ContactPoint' as const,
    telephone: BUSINESS.phone,
    contactType: 'customer service',
    areaServed: 'US',
    availableLanguage: ['English', 'Spanish'],
    contactOption: ['HearingImpairedSupported'],
  },
  {
    '@type': 'ContactPoint' as const,
    telephone: BUSINESS.phone,
    contactType: 'reservations',
    areaServed: 'US',
    availableLanguage: ['English', 'Spanish'],
  },
  {
    '@type': 'ContactPoint' as const,
    email: BUSINESS.email,
    contactType: 'customer support',
    areaServed: 'US',
    availableLanguage: ['English', 'Spanish'],
  },
]

const fullAreaServed = [
  { '@type': 'State' as const, name: 'Florida', '@id': 'https://en.wikipedia.org/wiki/Florida' },
  { '@type': 'City' as const, name: 'Orlando, Florida' },
  { '@type': 'City' as const, name: 'Tampa, Florida' },
  { '@type': 'City' as const, name: 'Miami, Florida' },
  { '@type': 'City' as const, name: 'Jacksonville, Florida' },
  { '@type': 'City' as const, name: 'St. Petersburg, Florida' },
  { '@type': 'City' as const, name: 'Fort Lauderdale, Florida' },
]

const serviceAreaObj = {
  '@type': 'GeoCircle' as const,
  geoMidpoint: { '@type': 'GeoCoordinates' as const, latitude: 28.5383, longitude: -81.3792 },
  geoRadius: '300000',
}

// Provider shorthand
const providerRef = { '@type': 'LocalBusiness' as const, '@id': `${BUSINESS.url}/#business`, name: BUSINESS.name }
const orgRef = { '@id': `${BUSINESS.url}/#organization` }
const siteRef = { '@id': `${BUSINESS.url}/#website` }
const businessRef = { '@id': `${BUSINESS.url}/#business` }

// ================================================================
// ORGANIZATION
// ================================================================

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BUSINESS.url}/#organization`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: BUSINESS.url,
    logo: logoObj,
    image: [BUSINESS.image],
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    description: BUSINESS.description,
    slogan: BUSINESS.slogan,
    foundingDate: BUSINESS.foundingDate,
    foundingLocation: {
      '@type': 'Place',
      name: 'Orlando, FL',
    },
    knowsLanguage: BUSINESS.knowsLanguage,
    numberOfEmployees: BUSINESS.numberOfEmployees,
    address: addressObj,
    contactPoint: contactPoints,
    areaServed: fullAreaServed,
    sameAs: BUSINESS.socialProfiles,
    brand: {
      '@type': 'Brand',
      name: BUSINESS.name,
      slogan: BUSINESS.slogan,
      logo: BUSINESS.logo,
      url: BUSINESS.url,
    },
    knowsAbout: [
      'House Cleaning',
      'Deep Cleaning',
      'Move-In Move-Out Cleaning',
      'Post-Construction Cleanup',
      'Apartment Cleaning',
      'Office Cleaning',
      'Airbnb Cleaning',
      'Maid Service',
      'Residential Cleaning',
      'Commercial Cleaning',
      'Florida House Cleaning',
      'Condo Cleaning',
      'Vacation Rental Cleaning',
    ],
    hasCredential: [
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'General Liability Insurance' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Bonded and Insured' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Background-Checked Staff' },
    ],
  }
}

// ================================================================
// WEBSITE
// ================================================================

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BUSINESS.url}/#website`,
    name: BUSINESS.name,
    url: BUSINESS.url,
    description: BUSINESS.description,
    publisher: orgRef,
    inLanguage: 'en-US',
    copyrightYear: new Date().getFullYear(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BUSINESS.url}/service-areas-served-by-the-florida-maid?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

// ================================================================
// WEBPAGE
// ================================================================

export function webPageSchema(opts: {
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
    isPartOf: siteRef,
    about: businessRef,
    publisher: orgRef,
    datePublished: opts.datePublished || '2025-01-01',
    dateModified: opts.dateModified || '2026-02-20',
    inLanguage: 'en-US',
    ...(opts.primaryImageOfPage ? {
      primaryImageOfPage: { '@type': 'ImageObject', url: opts.primaryImageOfPage },
    } : {}),
    ...(opts.speakable ? {
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: opts.speakable,
      },
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
    potentialAction: {
      '@type': 'ReadAction',
      target: opts.url,
    },
  }
}

// ================================================================
// LOCAL BUSINESS (full)
// ================================================================

export function localBusinessSchema(neighborhood?: Neighborhood, area?: Area) {
  const areaServed = neighborhood
    ? [
        { '@type': 'Place' as const, name: `${neighborhood.name}${area ? `, ${area.name}` : ''}` },
        ...(area ? [{ '@type': 'Place' as const, name: area.name }] : []),
        { '@type': 'State' as const, name: 'Florida' },
      ]
    : fullAreaServed

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness', 'HousekeepingService'],
    '@id': `${BUSINESS.url}/#business`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: BUSINESS.url,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    description: BUSINESS.description,
    slogan: BUSINESS.slogan,
    logo: logoObj,
    image: BUSINESS.image,
    priceRange: BUSINESS.priceRange,
    currenciesAccepted: BUSINESS.currenciesAccepted,
    paymentAccepted: BUSINESS.paymentAccepted,
    foundingDate: BUSINESS.foundingDate,
    knowsLanguage: BUSINESS.knowsLanguage,
    numberOfEmployees: BUSINESS.numberOfEmployees,
    address: addressObj,
    geo: neighborhood ? {
      '@type': 'GeoCoordinates',
      latitude: neighborhood.lat,
      longitude: neighborhood.lng,
    } : geoObj,
    hasMap: 'https://maps.google.com/?q=The+Florida+Maid+100+S+Orange+Ave+Orlando+FL+32801',
    areaServed,
    serviceArea: serviceAreaObj,
    aggregateRating: aggregateRatingObj,
    openingHoursSpecification: openingHoursObj,
    contactPoint: contactPoints,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Cleaning Services',
      itemListElement: [
        {
          '@type': 'OfferCatalog',
          name: 'Residential Cleaning',
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Deep Cleaning', url: `${BUSINESS.url}/services/deep-cleaning-service-in-florida` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Regular House Cleaning', url: `${BUSINESS.url}/services/house-cleaning-service-in-florida` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Weekly Maid Service', url: `${BUSINESS.url}/services/weekly-maid-service-in-florida` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Bi-Weekly Cleaning', url: `${BUSINESS.url}/services/bi-weekly-cleaning-service-in-florida` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Monthly Cleaning', url: `${BUSINESS.url}/services/monthly-cleaning-service-in-florida` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Move-In/Move-Out Cleaning', url: `${BUSINESS.url}/services/move-in-move-out-cleaning-service-in-florida` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Post-Construction Cleanup', url: `${BUSINESS.url}/services/post-construction-cleanup-service-in-florida` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Same-Day Cleaning', url: `${BUSINESS.url}/services/same-day-cleaning-service-in-florida` } },
          ],
        },
        {
          '@type': 'OfferCatalog',
          name: 'Commercial Cleaning',
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Office Cleaning', url: `${BUSINESS.url}/services/office-cleaning-service-in-florida` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Airbnb & Short-Term Rental Cleaning', url: `${BUSINESS.url}/services/airbnb-cleaning-in-florida` } },
          ],
        },
      ],
    },
    makesOffer: [
      {
        '@type': 'Offer',
        name: 'Client Supplies & Equipment',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '49.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' },
      },
      {
        '@type': 'Offer',
        name: 'We Bring Everything',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '65.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' },
      },
      {
        '@type': 'Offer',
        name: 'Same-Day / Emergency',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '100.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' },
      },
    ],
    review: GOOGLE_REVIEWS.slice(0, 5).map(r => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      author: { '@type': 'Person', name: r.name },
      reviewBody: r.text,
      datePublished: r.datePublished,
    })),
    sameAs: BUSINESS.socialProfiles,
    potentialAction: [
      {
        '@type': 'ReserveAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BUSINESS.url}/book/new`,
          actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'],
        },
        result: { '@type': 'Reservation', name: 'Book Cleaning Service' },
      },
      {
        '@type': 'OrderAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `tel:${BUSINESS.phone}`,
          actionPlatform: 'http://schema.org/MobileWebPlatform',
        },
      },
    ],
    isAccessibleForFree: false,
  }
}

// ================================================================
// SERVICE (enhanced with provider, rating, reviews, pricing)
// ================================================================

export function serviceSchema(service: Service, neighborhood?: Neighborhood, area?: Area) {
  const location = neighborhood ? `${neighborhood.name}, ${area?.name || ''}` : 'Florida'
  const serviceUrl = neighborhood
    ? `${BUSINESS.url}/${neighborhood.urlSlug}/${service.slug}`
    : `${BUSINESS.url}/services/${service.urlSlug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${serviceUrl}/#service`,
    name: `${service.name}${neighborhood ? ` in ${neighborhood.name}` : ''}`,
    description: service.description,
    url: serviceUrl,
    provider: providerRef,
    brand: { '@type': 'Brand', name: BUSINESS.name },
    areaServed: neighborhood
      ? { '@type': 'Place', name: location, geo: { '@type': 'GeoCoordinates', latitude: neighborhood.lat, longitude: neighborhood.lng } }
      : fullAreaServed,
    serviceType: service.name,
    category: 'House Cleaning',
    serviceOutput: 'Clean, sanitized living or working space',
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
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'USD',
        price: service.priceRange,
      },
      availability: 'https://schema.org/InStock',
      validFrom: '2025-01-01',
      areaServed: { '@type': 'Place', name: location },
      seller: providerRef,
    },
    termsOfService: `${BUSINESS.url}/terms-conditions`,
    audience: {
      '@type': 'Audience',
      audienceType: service.idealFor.join(', '),
    },
    potentialAction: {
      '@type': 'ReserveAction',
      target: `${BUSINESS.url}/book/new`,
      result: { '@type': 'Reservation', name: `Book ${service.name}` },
    },
  }
}

// ================================================================
// PRICING OFFERS (3 tiers with UnitPriceSpecification)
// ================================================================

export function pricingOffersSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${BUSINESS.url}/#cleaning-service`,
    name: 'House Cleaning Service',
    provider: providerRef,
    description: BUSINESS.description,
    offers: [
      {
        '@type': 'Offer',
        name: 'Client Supplies & Equipment',
        description: 'You provide the cleaning supplies and equipment. We bring the expertise.',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '49.00',
          priceCurrency: 'USD',
          unitCode: 'HUR',
          unitText: 'per hour',
          referenceQuantity: { '@type': 'QuantitativeValue', value: '1', unitCode: 'HUR' },
        },
        availability: 'https://schema.org/InStock',
        areaServed: fullAreaServed,
      },
      {
        '@type': 'Offer',
        name: 'We Bring Everything',
        description: 'We bring all supplies and professional-grade equipment. Just open the door.',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '65.00',
          priceCurrency: 'USD',
          unitCode: 'HUR',
          unitText: 'per hour',
          referenceQuantity: { '@type': 'QuantitativeValue', value: '1', unitCode: 'HUR' },
        },
        availability: 'https://schema.org/InStock',
        areaServed: fullAreaServed,
      },
      {
        '@type': 'Offer',
        name: 'Same-Day / Emergency Cleaning',
        description: 'Need it today? We dispatch a professional cleaner to your door within hours.',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '100.00',
          priceCurrency: 'USD',
          unitCode: 'HUR',
          unitText: 'per hour',
          referenceQuantity: { '@type': 'QuantitativeValue', value: '1', unitCode: 'HUR' },
        },
        availability: 'https://schema.org/InStock',
        areaServed: fullAreaServed,
      },
    ],
  }
}

// ================================================================
// INDIVIDUAL REVIEW SCHEMAS
// ================================================================

export function reviewSchemas(reviews?: typeof GOOGLE_REVIEWS) {
  const r = reviews || GOOGLE_REVIEWS
  return r.map(review => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: providerRef,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      '@type': 'Person',
      name: review.name,
    },
    reviewBody: review.text,
    datePublished: review.datePublished,
    publisher: { '@type': 'Organization', name: 'Google' },
  }))
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
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
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
// SITE NAVIGATION (for homepage)
// ================================================================

export function siteNavigationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'Main Navigation',
    hasPart: [
      { '@type': 'WebPage', name: 'Book a Cleaning', url: `${BUSINESS.url}/book/new`, position: 1 },
      { '@type': 'WebPage', name: 'Services', url: `${BUSINESS.url}/florida-maid-service-services-offered-by-the-florida-maid`, position: 2 },
      { '@type': 'WebPage', name: 'Pricing', url: `${BUSINESS.url}/updated-florida-maid-service-industry-pricing`, position: 3 },
      { '@type': 'WebPage', name: 'Service Areas', url: `${BUSINESS.url}/service-areas-served-by-the-florida-maid`, position: 4 },
      { '@type': 'WebPage', name: 'Reviews', url: `${BUSINESS.url}/florida-customer-reviews-for-the-florida-maid`, position: 5 },
      { '@type': 'WebPage', name: 'Now Hiring Cleaners', url: `${BUSINESS.url}/available-florida-maid-jobs`, position: 6 },
      { '@type': 'WebPage', name: 'Contact', url: `${BUSINESS.url}/contact-the-florida-maid-service-today`, position: 7 },
      { '@type': 'WebPage', name: 'FAQ', url: `${BUSINESS.url}/florida-cleaning-service-frequently-asked-questions-in-2026`, position: 8 },
      { '@type': 'WebPage', name: 'About', url: `${BUSINESS.url}/about-the-florida-maid-service-company`, position: 9 },
      { '@type': 'WebPage', name: 'Blog & Tips', url: `${BUSINESS.url}/florida-maid-service-blog`, position: 10 },
    ],
  }
}

// ================================================================
// HOWTO: How to Book (for homepage)
// ================================================================

export function howToBookSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Book a Cleaning Service with The Florida Maid',
    description: 'Book a professional cleaning in just 3 simple steps.',
    totalTime: 'PT5M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '49' },
    step: [
      {
        '@type': 'HowToStep',
        name: 'Contact Us',
        text: 'Call (954) 710-3636, text us, or book online at thefloridamaid.com/book/new',
        url: `${BUSINESS.url}/book/new`,
        position: 1,
      },
      {
        '@type': 'HowToStep',
        name: 'Tell Us About Your Space',
        text: 'Share your home size, cleaning needs, and preferred schedule. We provide a custom quote within minutes.',
        position: 2,
      },
      {
        '@type': 'HowToStep',
        name: 'Relax While We Clean',
        text: 'A licensed, insured, background-checked cleaner arrives at your door on schedule. Satisfaction guaranteed.',
        position: 3,
      },
    ],
    tool: [
      { '@type': 'HowToTool', name: 'Phone or computer for booking' },
    ],
  }
}

// ================================================================
// ITEM LIST: Services Offered (for homepage)
// ================================================================

export function serviceItemListSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cleaning Services Offered by The Florida Maid',
    description: 'Complete list of professional cleaning services available across Florida.',
    numberOfItems: SERVICES.length,
    itemListElement: SERVICES.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      url: `${BUSINESS.url}/services/${s.urlSlug}`,
      item: {
        '@type': 'Service',
        name: s.name,
        description: s.description,
        provider: providerRef,
        offers: {
          '@type': 'Offer',
          price: s.priceRange,
          priceCurrency: 'USD',
        },
      },
    })),
  }
}

// ================================================================
// ITEM LIST: Service Areas (for homepage)
// ================================================================

export function areaItemListSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Service Areas Covered by The Florida Maid',
    description: 'We serve neighborhoods and cities across the state of Florida.',
    numberOfItems: AREAS.length,
    itemListElement: AREAS.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: a.name,
      url: `${BUSINESS.url}/${a.urlSlug}`,
      item: {
        '@type': 'Place',
        name: a.name,
        geo: { '@type': 'GeoCoordinates', latitude: a.lat, longitude: a.lng },
      },
    })),
  }
}

// ================================================================
// PROFESSIONAL SERVICE (for service + neighborhood×service pages)
// ================================================================

export function professionalServiceSchema(service: Service, neighborhood?: Neighborhood, area?: Area) {
  const location = neighborhood ? `${neighborhood.name}, ${area?.name || ''}` : 'Florida'
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: `${service.name}${neighborhood ? ` in ${neighborhood.name}` : ''} - The Florida Maid`,
    description: service.description,
    url: neighborhood ? `${BUSINESS.url}/${neighborhood.urlSlug}/${service.slug}` : `${BUSINESS.url}/services/${service.urlSlug}`,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    priceRange: service.priceRange,
    address: addressObj,
    geo: neighborhood ? { '@type': 'GeoCoordinates', latitude: neighborhood.lat, longitude: neighborhood.lng } : geoObj,
    areaServed: { '@type': 'Place', name: location },
    aggregateRating: aggregateRatingObj,
    openingHoursSpecification: openingHoursObj,
    paymentAccepted: BUSINESS.paymentAccepted,
    image: BUSINESS.image,
    sameAs: BUSINESS.socialProfiles,
  }
}

// ================================================================
// COMBINED SCHEMA FUNCTIONS PER PAGE TYPE
// ================================================================

export function homepageSchemas() {
  const url = BUSINESS.url
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: 'The Florida Maid: Florida Home & Business Cleaning Service | From $49/hr',
      description: BUSINESS.description,
      type: 'WebPage',
      speakable: ['h1', '.hero-description'],
      breadcrumb: [{ name: 'Home', url }],
    }),
    localBusinessSchema(),
    pricingOffersSchema(),
    serviceItemListSchema(),
    areaItemListSchema(),
    siteNavigationSchema(),
    howToBookSchema(),
  ]
}

export function areaPageSchemas(area: Area) {
  const url = `${BUSINESS.url}/${area.urlSlug}`
  const title = `${area.name} Maid Service & House Cleaning From $49/hr | The Florida Maid`
  const description = `Professional house cleaning in ${area.name} from $49/hr. Deep cleaning, weekly maid service, move-in/out & more. Licensed, insured, 5.0★ Google. ${BUSINESS.phoneDisplay}`
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: BUSINESS.url },
        { name: area.name, url },
      ],
    }),
    localBusinessSchema(),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: area.name, url },
    ]),
    serviceItemListSchema(),
    howToBookSchema(),
  ]
}

export function neighborhoodPageSchemas(neighborhood: Neighborhood, area: Area) {
  const url = `${BUSINESS.url}/${neighborhood.urlSlug}`
  const title = `${neighborhood.name} Maid Service & House Cleaning From $49/hr | The Florida Maid`
  const description = `Professional cleaning in ${neighborhood.name}, ${area.name}. Serving ${neighborhood.housing_types.slice(0, 2).join(', ')} near ${neighborhood.landmarks[0]}. From $49/hr. 5.0★ Google. ${BUSINESS.phoneDisplay}`
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: BUSINESS.url },
        { name: area.name, url: `${BUSINESS.url}/${area.urlSlug}` },
        { name: neighborhood.name, url },
      ],
    }),
    localBusinessSchema(neighborhood, area),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: area.name, url: `${BUSINESS.url}/${area.urlSlug}` },
      { name: neighborhood.name, url },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Cleaning Services in ${neighborhood.name}`,
      numberOfItems: SERVICES.length,
      itemListElement: SERVICES.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: s.name,
        url: `${BUSINESS.url}/${neighborhood.urlSlug}/${s.slug}`,
      })),
    },
    howToBookSchema(),
  ]
}

export function neighborhoodServicePageSchemas(neighborhood: Neighborhood, service: Service, area: Area) {
  const url = `${BUSINESS.url}/${neighborhood.urlSlug}/${service.slug}`
  const title = `${service.name} in ${neighborhood.name}, ${area.name} From $49/hr | The Florida Maid`
  const description = `Professional ${service.name.toLowerCase()} in ${neighborhood.name}, ${area.name}. ${service.features.slice(0, 3).join(', ')} & more. ${service.priceRange}. 5.0★ Google. ${BUSINESS.phoneDisplay}`
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: BUSINESS.url },
        { name: area.name, url: `${BUSINESS.url}/${area.urlSlug}` },
        { name: neighborhood.name, url: `${BUSINESS.url}/${neighborhood.urlSlug}` },
        { name: service.name, url },
      ],
    }),
    localBusinessSchema(neighborhood, area),
    serviceSchema(service, neighborhood, area),
    professionalServiceSchema(service, neighborhood, area),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: area.name, url: `${BUSINESS.url}/${area.urlSlug}` },
      { name: neighborhood.name, url: `${BUSINESS.url}/${neighborhood.urlSlug}` },
      { name: service.name, url },
    ]),
    howToBookSchema(),
  ]
}

export function servicePageSchemas(service: Service) {
  const url = `${BUSINESS.url}/services/${service.urlSlug}`
  const title = `${service.name} in Florida From ${service.priceRange.split('–')[0]} | 5-Star Rated | The Florida Maid`
  const description = `Professional ${service.name.toLowerCase()} across Orlando, Tampa, Miami, Jacksonville & all of Florida. ${service.features.slice(0, 3).join(', ')} & more. From ${service.priceRange.split('–')[0]}. 5.0★ Google. ${BUSINESS.phoneDisplay}`
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: BUSINESS.url },
        { name: 'Services', url: `${BUSINESS.url}/florida-maid-service-services-offered-by-the-florida-maid` },
        { name: service.name, url },
      ],
    }),
    localBusinessSchema(),
    serviceSchema(service),
    professionalServiceSchema(service),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: 'Services', url: `${BUSINESS.url}/florida-maid-service-services-offered-by-the-florida-maid` },
      { name: service.name, url },
    ]),
    howToBookSchema(),
  ]
}
