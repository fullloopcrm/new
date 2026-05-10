// @ts-nocheck
import type { Neighborhood } from './locations'
import type { Service } from './services'
import type { Area } from './data/areas'
import { SERVICES } from './services'
import { AREAS } from './data/areas'

const BUSINESS = {
  name: 'Wash and Fold NYC',
  legalName: 'Wash and Fold NYC Laundry Service LLC',
  url: 'https://www.washandfoldnyc.com',
  phone: '+1-917-970-6002',
  phoneDisplay: '(917) 970-6002',
  email: 'hi@washandfoldnyc.com',
  logo: 'https://www.washandfoldnyc.com/icon-512.png',
  image: 'https://www.washandfoldnyc.com/icon-512.png',
  priceRange: '$$',
  ratingValue: '5.0',
  ratingCount: '16',
  reviewCount: '16',
  foundingDate: '2024',
  currenciesAccepted: 'USD',
  paymentAccepted: 'Cash, Credit Card, Debit Card, Zelle (hi@washandfoldnyc.com), Venmo, Apple Pay',
  description: 'Professional wash and fold laundry service across New York City. $3/lb with free pickup and delivery. Same-day rush available. Dry laundry, comforter laundry, and commercial laundry. Serving Manhattan, Brooklyn, and Queens.',
  slogan: "NYC's Most Convenient Laundry Service",
  knowsLanguage: ['en', 'es'],
  numberOfEmployees: { '@type': 'QuantitativeValue' as const, minValue: 10, maxValue: 25 },
  address: {
    street: '150 W 47th St',
    city: 'New York',
    state: 'NY',
    zip: '10036',
    country: 'US',
  },
  socialProfiles: [] as string[],
}

// Google reviews for laundry service
const GOOGLE_REVIEWS = [
  { text: 'Best wash and fold in the city. My clothes come back perfectly folded every time. The pickup and delivery is so convenient — I never have to leave my apartment.', name: 'Rachel Kim', location: 'New York', rating: 5, datePublished: '2026-03-15' },
  { text: 'Finally found a laundry service I can trust. They handle my delicates with care and everything smells amazing. The per-pound pricing is straightforward — no hidden fees.', name: 'Marcus Johnson', location: 'New York', rating: 5, datePublished: '2026-03-10' },
  { text: 'Same-day turnaround is a lifesaver. Dropped off a huge bag in the morning, had it back by evening. Everything perfectly folded and organized. Highly recommend!', name: 'Emily Chen', location: 'New York', rating: 5, datePublished: '2026-03-02' },
  { text: 'I switched from my old laundromat and the difference is night and day. They actually separate colors, use quality detergent, and fold everything neatly. Worth every penny.', name: 'David Torres', location: 'New York', rating: 5, datePublished: '2026-02-25' },
  { text: 'They picked up my laundry from my doorstep at 8am and had it back by the afternoon. Clean, fresh, and perfectly folded. This is how laundry should work in NYC.', name: 'Samantha Reeves', location: 'New York', rating: 5, datePublished: '2026-02-20' },
  { text: 'Been using them weekly for three months now. Always on time, always consistent. My shirts are folded better than I could ever do myself. Great communication too.', name: 'Jason Park', location: 'New York', rating: 5, datePublished: '2026-02-14' },
  { text: 'Moved to NYC and dreaded the laundromat situation. A friend recommended Wash and Fold NYC and I haven\'t looked back. Pickup, wash, fold, deliver — all handled.', name: 'Olivia Morales', location: 'New York', rating: 5, datePublished: '2026-02-08' },
  { text: 'They handled my king-size comforter and a bag of regular laundry. Everything came back fresh and clean. The comforter was fluffy like new. Reasonable pricing too.', name: 'Andre Williams', location: 'New York', rating: 5, datePublished: '2026-01-30' },
  { text: 'Super responsive over text. Scheduled a pickup in minutes and my laundry was done the same day. No missing socks, no shrinkage, no complaints. Five stars.', name: 'Christine Liu', location: 'New York', rating: 5, datePublished: '2026-01-22' },
  { text: 'I run an Airbnb in Brooklyn and they handle all my linens and towels between guests. Fast turnaround, always spotless, and they fold the towels exactly how I need them.', name: 'Tyler Brooks', location: 'New York', rating: 5, datePublished: '2026-01-15' },
  { text: 'Tried three different laundry services before finding Wash and Fold NYC. They\'re the only ones who consistently get it right — clean clothes, no damage, on time every single time.', name: 'Priya Nair', location: 'New York', rating: 5, datePublished: '2026-01-08' },
  { text: 'The convenience factor alone is worth it. But on top of that, my clothes have never been cleaner. They even got a stain out of my favorite shirt that I thought was ruined.', name: 'Michael Ortiz', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'Affordable, reliable, and fast. I drop off on my way to work and pick up on my way home. My laundry is always ready when they say it will be. No surprises.', name: 'Hannah Scott', location: 'New York', rating: 5, datePublished: '2025-12-10' },
  { text: 'As a busy nurse working 12-hour shifts, the last thing I want to do is laundry. Wash and Fold NYC handles everything for me. Scrubs, sheets, towels — all done.', name: 'Danielle Foster', location: 'New York', rating: 5, datePublished: '2025-11-28' },
  { text: 'Great service for families. We generate a LOT of laundry with two kids and they handle it all without breaking the bank. The per-pound pricing makes so much sense.', name: 'Kevin Walsh', location: 'New York', rating: 5, datePublished: '2025-11-15' },
  { text: 'I\'ve recommended them to everyone in my building. Professional, affordable, and the turnaround time is incredible. NYC laundry done right.', name: 'Sofia Martinez', location: 'New York', rating: 5, datePublished: '2025-11-01' },
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
  latitude: 40.7589,
  longitude: -73.9851,
}

const logoObj = {
  '@type': 'ImageObject' as const,
  '@id': `${BUSINESS.url}/#logo`,
  url: BUSINESS.logo,
  contentUrl: BUSINESS.logo,
  width: 512,
  height: 512,
  caption: 'Wash and Fold NYC Logo',
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
  { '@type': 'City' as const, name: 'New York', '@id': 'https://en.wikipedia.org/wiki/New_York_City' },
  { '@type': 'AdministrativeArea' as const, name: 'Manhattan, New York' },
  { '@type': 'AdministrativeArea' as const, name: 'Brooklyn, New York' },
  { '@type': 'AdministrativeArea' as const, name: 'Queens, New York' },
  { '@type': 'AdministrativeArea' as const, name: 'Nassau County, New York' },
  { '@type': 'AdministrativeArea' as const, name: 'Suffolk County, New York' },
]

const serviceAreaObj = {
  '@type': 'GeoCircle' as const,
  geoMidpoint: { '@type': 'GeoCoordinates' as const, latitude: 40.7589, longitude: -73.9851 },
  geoRadius: '80000',
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
      name: 'New York City, NY',
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
      'Wash and Fold',
      'Deep Laundry',
      'Move-In Move-Out Laundry',
      'Post-Construction Cleanup',
      'Apartment Laundry',
      'Office Laundry',
      'Airbnb Laundry',
      'Wash and Fold',
      'Residential Laundry',
      'Commercial Laundry',
      'NYC Apartment Laundry',
      'Brownstone Laundry',
      'High-Rise Laundry',
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
        urlTemplate: `${BUSINESS.url}/locations?q={search_term_string}`,
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
        { '@type': 'City' as const, name: 'New York City' },
      ]
    : fullAreaServed

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness', 'LaundryOrDryLaundryService'],
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
    hasMap: 'https://maps.google.com/?q=Wash+and+Fold+NYC+150+W+47th+St+New+York+NY+10036',
    areaServed,
    serviceArea: serviceAreaObj,
    aggregateRating: aggregateRatingObj,
    openingHoursSpecification: openingHoursObj,
    contactPoint: contactPoints,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Laundry Services',
      itemListElement: [
        {
          '@type': 'OfferCatalog',
          name: 'Residential Laundry',
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Wash & Fold', url: `${BUSINESS.url}/services/nyc-wash-and-fold` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Pickup & Delivery Laundry', url: `${BUSINESS.url}/services/nyc-pickup-and-delivery` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'In-Unit Laundry Service', url: `${BUSINESS.url}/services/nyc-in-unit-laundry-service` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'In-Building Laundry Service', url: `${BUSINESS.url}/services/nyc-in-building-laundry-service` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Dry Cleaning', url: `${BUSINESS.url}/services/nyc-dry-cleaning` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Comforter & Bedding Cleaning', url: `${BUSINESS.url}/services/nyc-comforter-cleaning` } },
          ],
        },
        {
          '@type': 'OfferCatalog',
          name: 'Commercial Laundry',
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Commercial Laundry', url: `${BUSINESS.url}/services/nyc-commercial-laundry` } },
          ],
        },
      ],
    },
    makesOffer: [
      {
        '@type': 'Offer',
        name: 'Wash and Fold',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '3.00', priceCurrency: 'USD', unitCode: 'LBR', unitText: 'per pound' },
      },
      {
        '@type': 'Offer',
        name: 'Wash and Fold — Free Pickup & Delivery',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '3.00', priceCurrency: 'USD', unitCode: 'LBR', unitText: 'per pound' },
      },
      {
        '@type': 'Offer',
        name: 'Same-Day Rush (+$20)',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '3.00', priceCurrency: 'USD', unitCode: 'LBR', unitText: 'per pound plus $20 rush fee' },
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
          urlTemplate: `tel:${BUSINESS.phone}`,
          actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'],
        },
        result: { '@type': 'Reservation', name: 'Book Laundry Service' },
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
  const location = neighborhood ? `${neighborhood.name}, ${area?.name || ''}` : 'New York City'
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
    category: 'Wash and Fold',
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
      target: `tel:${BUSINESS.phone}`,
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
    '@id': `${BUSINESS.url}/#laundry-service`,
    name: 'Wash and Fold Service',
    provider: providerRef,
    description: BUSINESS.description,
    offers: [
      {
        '@type': 'Offer',
        name: 'Client Supplies & Equipment',
        description: 'You provide the laundry supplies and equipment. We bring the expertise.',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '3.00',
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
          price: '3.00',
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
        name: 'Same-Day / Emergency Laundry',
        description: 'Need it today? We dispatch a laundry professional to your door within hours.',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '3.00',
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
      { '@type': 'WebPage', name: 'Contact', url: `${BUSINESS.url}/contact`, position: 1 },
      { '@type': 'WebPage', name: 'Services', url: `${BUSINESS.url}/services`, position: 2 },
      { '@type': 'WebPage', name: 'Pricing', url: `${BUSINESS.url}/pricing`, position: 3 },
      { '@type': 'WebPage', name: 'Service Areas', url: `${BUSINESS.url}/locations`, position: 4 },
      { '@type': 'WebPage', name: 'Reviews', url: `${BUSINESS.url}/reviews`, position: 5 },
      { '@type': 'WebPage', name: 'Now Hiring', url: `${BUSINESS.url}/careers`, position: 6 },
      { '@type': 'WebPage', name: 'Contact', url: `${BUSINESS.url}/contact`, position: 7 },
      { '@type': 'WebPage', name: 'FAQ', url: `${BUSINESS.url}/nyc-laundry-service-frequently-asked-questions-in-2025`, position: 8 },
      { '@type': 'WebPage', name: 'About', url: `${BUSINESS.url}/about`, position: 9 },
      { '@type': 'WebPage', name: 'Blog', url: `${BUSINESS.url}/blog`, position: 10 },
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
    name: 'How to Book a Laundry Service with Wash and Fold NYC',
    description: 'Book a professional laundry in just 3 simple steps.',
    totalTime: 'PT5M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '49' },
    step: [
      {
        '@type': 'HowToStep',
        name: 'Contact Us',
        text: 'Call or text (917) 970-6002 to schedule your laundry.',
        url: `${BUSINESS.url}/contact`,
        position: 1,
      },
      {
        '@type': 'HowToStep',
        name: 'Tell Us About Your Space',
        text: 'Share your home size, laundry needs, and preferred schedule. We provide a custom quote within minutes.',
        position: 2,
      },
      {
        '@type': 'HowToStep',
        name: 'Relax While We Clean',
        text: 'Your laundry is processed by our licensed, insured team and delivered at your door on schedule. Satisfaction guaranteed.',
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
    name: 'Laundry Services Offered by Wash and Fold NYC',
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
    name: 'Service Areas Covered by Wash and Fold NYC',
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
  const location = neighborhood ? `${neighborhood.name}, ${area?.name || ''}` : 'NYC Metro Area'
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: `${service.name}${neighborhood ? ` in ${neighborhood.name}` : ''} - Wash and Fold NYC`,
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
      name: 'NYC Wash and Fold & Wash and Fold From $3/lb | 5-Star Rated | Wash and Fold NYC',
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
  const title = `${area.name} Wash and Fold & Wash and Fold From $3/lb | Wash and Fold NYC`
  const description = `Professional wash and fold in ${area.name} from $3/lb. Wash and fold, pickup & delivery, dry laundry, comforter laundry. Licensed, insured, 5.0★ Google. ${BUSINESS.phoneDisplay}`
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
  const title = `${neighborhood.name} Wash and Fold & Wash and Fold From $3/lb | Wash and Fold NYC`
  const description = `Professional wash and fold in ${neighborhood.name}, ${area.name}. Serving ${neighborhood.housing_types.slice(0, 2).join(', ')} near ${neighborhood.landmarks[0]}. From $3/lb. 5.0★ Google. ${BUSINESS.phoneDisplay}`
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
      name: `Laundry Services in ${neighborhood.name}`,
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
  const title = `${service.name} in ${neighborhood.name}, ${area.name} From $3/lb | Wash and Fold NYC`
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
  const title = `${service.name} in NYC From ${service.priceRange.split('–')[0]} | 5-Star Rated | Wash and Fold NYC`
  const desc = `Professional ${service.name.toLowerCase()} across Manhattan, Brooklyn & Queens. ${service.features.slice(0, 3).join(', ')} & more. ${service.priceRange}. 5.0★ Google. ${BUSINESS.phoneDisplay}`
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: title,
      description: desc,
      breadcrumb: [
        { name: 'Home', url: BUSINESS.url },
        { name: 'Services', url: `${BUSINESS.url}/services` },
        { name: service.name, url },
      ],
    }),
    localBusinessSchema(),
    serviceSchema(service),
    professionalServiceSchema(service),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: 'Services', url: `${BUSINESS.url}/services` },
      { name: service.name, url },
    ]),
    howToBookSchema(),
  ]
}
