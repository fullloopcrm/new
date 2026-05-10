// @ts-nocheck
import type { Neighborhood } from './locations'
import type { Service } from './services'
import type { Area } from './data/areas'
import { SERVICES } from './services'
import { AREAS } from './data/areas'

const BUSINESS = {
  name: 'Sunnyside Clean NYC',
  legalName: 'Sunnyside Clean NYC — A NYC Maid Services Company',
  url: 'https://www.cleaningservicesunnysideny.com',
  phone: '+1-212-202-8400',
  phoneDisplay: '(212) 202-8400',
  email: 'hi@thenycmaid.com',
  logo: 'https://www.cleaningservicesunnysideny.com/icon-512.png',
  image: 'https://www.cleaningservicesunnysideny.com/icon-512.png',
  priceRange: '$$',
  ratingValue: '5.0',
  ratingCount: '27',
  reviewCount: '27',
  foundingDate: '2018',
  currenciesAccepted: 'USD',
  paymentAccepted: 'Cash, Credit Card, Debit Card, Zelle (hi@thenycmaid.com), Venmo, Apple Pay',
  description: 'Professional house cleaning services across New York City — Manhattan, Brooklyn & Queens. Deep cleaning, regular apartment cleaning, move-in/move-out, post-construction cleanup, weekly cleaning service, same-day cleaning, Airbnb turnover, and office cleaning. Licensed, insured, and background-checked cleaners. A NYC Maid Services Company — serving NYC since 2018.',
  slogan: "New York City's Most Trusted Cleaning Service",
  knowsLanguage: ['en', 'es'],
  numberOfEmployees: { '@type': 'QuantitativeValue' as const, minValue: 10, maxValue: 25 },
  address: {
    street: '150 W 47th St',
    city: 'New York',
    state: 'NY',
    zip: '10036',
    country: 'US',
  },
  socialProfiles: [
    'https://www.yelp.com/biz/the-nyc-maid-new-york',
    'https://www.instagram.com/thenycmaid/',
    'https://www.facebook.com/thenycmaid/',
  ],
}

// Real Google reviews (all 27, 5-star)
const GOOGLE_REVIEWS = [
  { text: 'Awesome cleaners and very responsive. I\'ve used them for several months now for my 3 bed 3 bath walk up in Hell\'s Kitchen. Karina is my cleaner. She is so sweet and warm and lovely.', name: 'Lindsey Hill', location: 'New York', rating: 5, datePublished: '2026-02-17' },
  { text: 'Karina was great and very helpful', name: 'Joseph Busacca', location: 'New York', rating: 5, datePublished: '2026-02-19' },
  { text: 'Great job. Friendly and professional.', name: 'Adam Berger', location: 'New York', rating: 5, datePublished: '2026-02-17' },
  { text: 'Ines Enriquez was incredible. Loved this job. Worth every penny.', name: 'Jessica Pace', location: 'New York', rating: 5, datePublished: '2026-02-16' },
  { text: 'Jeff is a real gem. Super communicative easy going and responsive. In a city with a lot of fly by night operations, Sunnyside Clean is the real deal.', name: 'Brad Lieberman', location: 'New York', rating: 5, datePublished: '2026-02-06' },
  { text: 'Moving into an apartment clean. Had my daughter\'s room, a bathroom and a kitchen to clean. Cindy came and cleaned very well. Even cleaned up my living room as bonus. Right on time, fast, easy to book and communicate. Will be using again. No complaints!', name: 'Eeland Stribling', location: 'New York', rating: 5, datePublished: '2026-01-23' },
  { text: 'Great experience. Texted the number on their website on Saturday and had a deep cleaning scheduled for that following Monday at 9am. The cleaner was prompt and super nice/friendly.', name: 'Kelsey Wheeler', location: 'New York', rating: 5, datePublished: '2026-02-06' },
  { text: 'Maria did an amazing job! My apartment is spotless and she is so easy to work with. Was very happy to accommodate all of my requests.', name: 'Jason Klig', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'I called for an emergency cleaning Jeff took care of it right away. Karina did an amazing job and she\'s incredibly sweet. I\'ll definitely be using their services again!', name: 'Jessica Papantoniou', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'We hired them for cleaning our offices in Manhattan and no doubt they are the best we ever had. Affordable pricing, staff was friendly and on time.', name: 'Endrit Jonuzi', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'Karina was incredible. She was extremely meticulous and left my apt spotless. 10/10; will definitely use again.', name: 'Shannon Atran', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'Maria is the grandmother you didn\'t know you needed. Couldn\'t recommend a more trustworthy and tidy business.', name: 'Will Gags', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'Karina was wonderful! She left my home in exceptional condition and I\'m looking forward to having her come again!', name: 'Blair Silver-Matthes', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'Gloria was great and very nice. Felt comfortable with her cleaning home.', name: 'Vijay Chadderwala', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'Service was great and very friendly staff.', name: 'Priya Vadlamudi', location: 'New York', rating: 5, datePublished: '2025-11-20' },
  { text: 'Great service, cleaning, and pricing!', name: 'Erik Berlin', location: 'New York', rating: 5, datePublished: '2025-12-20' },
  { text: 'Super fast to book, incredibly kind people, and great results!', name: 'Kayli Watson', location: 'New York', rating: 5, datePublished: '2024-08-15' },
  { text: 'We just had our apartment painted and needed a deep clean to get rid of loads of dust. Sunnyside Clean NYC sent a wonderful cleaner who was prompt, professional and did an amazing job. Highly recommend!!!', name: 'Julie Salamon', location: 'New York', rating: 5, datePublished: '2024-06-22' },
  { text: 'Super detailed!', name: 'Moodap', location: 'New York', rating: 5, datePublished: '2024-09-10' },
  { text: 'Everything was spotless, from oven stove to fridge.', name: 'Antong', location: 'New York', rating: 5, datePublished: '2024-05-18' },
  { text: "Best cleaning service I've used in the 20 years I've lived in NYC! Consistently efficient, thorough...", name: 'Courtney Gamble', location: 'New York', rating: 5, datePublished: '2024-07-03' },
  { text: 'Perfect for post move deep cleaning. Appliances were spotless. Looked brand new.', name: 'Shilpa Ray', location: 'New York', rating: 5, datePublished: '2024-04-28' },
  { text: 'The very best service every time, amazing!!', name: 'Greg Farr', location: 'New York', rating: 5, datePublished: '2024-03-14' },
  { text: 'Sunnyside Clean NYC is so efficient and professional! I know I can always count on them.', name: 'Maria Lina', location: 'New York', rating: 5, datePublished: '2024-02-20' },
  { text: 'Excellent service and a great price! Prompt and thorough, would highly recommend!', name: 'Timothy Wojcik', location: 'New York', rating: 5, datePublished: '2024-01-15' },
  { text: '5 Stars - Absolutely the Best Cleaning Service in NYC! I gotta say, Sunnyside Clean is truly the best.', name: 'Jenni Martinez', location: 'New York', rating: 5, datePublished: '2023-11-08' },
  { text: 'After trying three different cleaning companies in NYC, Sunnyside Clean NYC is hands down the most affordable and thorough.', name: 'Jenna M', location: 'New York', rating: 5, datePublished: '2023-10-22' },
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
  caption: 'Sunnyside Clean NYC Logo',
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
    contactOption: ['TollFree', 'HearingImpairedSupported'],
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
  { '@type': 'Borough' as const, name: 'Manhattan, New York' },
  { '@type': 'Borough' as const, name: 'Brooklyn, New York' },
  { '@type': 'Borough' as const, name: 'Queens, New York' },
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
      'House Cleaning',
      'Deep Cleaning',
      'Move-In Move-Out Cleaning',
      'Post-Construction Cleanup',
      'Apartment Cleaning',
      'Office Cleaning',
      'Airbnb Cleaning',
      'Cleaning Service',
      'Residential Cleaning',
      'Commercial Cleaning',
      'NYC Apartment Cleaning',
      'Brownstone Cleaning',
      'High-Rise Cleaning',
    ],
    hasCredential: [
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'General Liability Insurance' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Bonded and Insured' },
      { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Background-Checked Staff' },
    ],
    aggregateRating: aggregateRatingObj,
    review: GOOGLE_REVIEWS.slice(0, 3).map(r => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      author: { '@type': 'Person', name: r.name },
      reviewBody: r.text,
      datePublished: r.datePublished,
    })),
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
        urlTemplate: `${BUSINESS.url}/service-areas?q={search_term_string}`,
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
    hasMap: 'https://maps.google.com/?q=Sunnyside+Clean+NYC+150+W+47th+St+New+York+NY+10036',
    areaServed,
    serviceArea: serviceAreaObj,
    aggregateRating: aggregateRatingObj,
    openingHoursSpecification: openingHoursObj,
    contactPoint: contactPoints,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Cleaning Services',
      itemListElement: SERVICES.map(s => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, url: `${BUSINESS.url}/services/${s.urlSlug}` },
      })),
    },
    makesOffer: [
      {
        '@type': 'Offer',
        name: 'Client Supplies & Equipment',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '59.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' },
      },
      {
        '@type': 'Offer',
        name: 'We Bring Everything',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '79.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' },
      },
      {
        '@type': 'Offer',
        name: 'Same-Day / Emergency',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '99.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' },
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
          urlTemplate: 'https://www.thenycmaid.com/book/new',
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
    aggregateRating: aggregateRatingObj,
    review: GOOGLE_REVIEWS.slice(0, 2).map(r => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      author: { '@type': 'Person', name: r.name },
      reviewBody: r.text,
      datePublished: r.datePublished,
    })),
    termsOfService: `https://www.thenycmaid.com/terms-conditions`,
    audience: {
      '@type': 'Audience',
      audienceType: service.idealFor.join(', '),
    },
    potentialAction: {
      '@type': 'ReserveAction',
      target: 'https://www.thenycmaid.com/book/new',
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
          price: '59.00',
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
          price: '79.00',
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
          price: '99.00',
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
      { '@type': 'WebPage', name: 'Home', url: BUSINESS.url },
      { '@type': 'WebPage', name: 'Services', url: `${BUSINESS.url}/nyc-cleaning-services-offered` },
      { '@type': 'WebPage', name: 'Service Areas', url: `${BUSINESS.url}/service-areas` },
      { '@type': 'WebPage', name: 'Pricing', url: `${BUSINESS.url}/nyc-cleaning-service-pricing` },
      { '@type': 'WebPage', name: 'Reviews', url: 'https://share.google/Iq9oblq3vJr07aP27' },
      { '@type': 'WebPage', name: 'FAQ', url: `${BUSINESS.url}/frequently-asked-cleaning-service-related-questions` },
      { '@type': 'WebPage', name: 'Blog', url: `${BUSINESS.url}/cleaning-tips-and-tricks` },
      { '@type': 'WebPage', name: 'About', url: `${BUSINESS.url}/about-nyc-cleaning-service-sunnyside-clean-nyc` },
      { '@type': 'WebPage', name: 'Contact', url: `${BUSINESS.url}/contact-nyc-cleaning-service-sunnyside-clean-nyc` },
      { '@type': 'WebPage', name: 'Self Booking $20 OFF', url: 'https://www.thenycmaid.com/book/new' },
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
    name: 'How to Book a Cleaning Service with Sunnyside Clean NYC',
    description: 'Book a professional cleaning in just 3 simple steps.',
    totalTime: 'PT5M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '49' },
    step: [
      {
        '@type': 'HowToStep',
        name: 'Contact Us',
        text: 'Call (212) 202-8400, text us, or book online at cleaningservicesunnysideny.com',
        url: 'https://www.thenycmaid.com/book/new',
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
    name: 'Cleaning Services Offered by Sunnyside Clean NYC',
    description: 'Complete list of professional cleaning services available across NYC — Manhattan, Brooklyn & Queens.',
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
    name: 'Service Areas Covered by Sunnyside Clean NYC',
    description: `We serve over ${AREAS.length * 80}+ neighborhoods across Manhattan, Brooklyn & Queens.`,
    numberOfItems: AREAS.length,
    itemListElement: AREAS.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: a.name,
      url: `${BUSINESS.url}/service-areas/${a.urlSlug}`,
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
    name: `${service.name}${neighborhood ? ` in ${neighborhood.name}` : ''} - Sunnyside Clean NYC`,
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
      name: 'NYC Cleaning Service & House Cleaning From $59/hr | 5-Star Rated | Sunnyside Clean NYC',
      description: BUSINESS.description,
      type: 'CollectionPage',
      speakable: ['h1', '.hero-description'],
      breadcrumb: [{ name: 'Home', url }],
    }),
    localBusinessSchema(),
    pricingOffersSchema(),
    serviceItemListSchema(),
    areaItemListSchema(),
    siteNavigationSchema(),
    howToBookSchema(),
    ...reviewSchemas(),
    // FAQPage is rendered by FAQSection component
  ]
}

export function areaPageSchemas(area: Area) {
  const url = `${BUSINESS.url}/service-areas/${area.urlSlug}`
  const title = `${area.name} Cleaning Service & House Cleaning From $59/hr | Sunnyside Clean NYC`
  const description = `Professional house cleaning in ${area.name} from $59/hr. Deep cleaning, weekly cleaning service, move-in/out & more. Licensed, insured, 5.0★ Google. ${BUSINESS.phoneDisplay}`
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
    ...reviewSchemas(GOOGLE_REVIEWS.slice(0, 5)),
  ]
}

export function neighborhoodPageSchemas(neighborhood: Neighborhood, area: Area) {
  const url = `${BUSINESS.url}/service-areas/${neighborhood.urlSlug}`
  const title = `${neighborhood.name} Cleaning Service & House Cleaning From $59/hr | Sunnyside Clean NYC`
  const description = `Professional cleaning in ${neighborhood.name}, ${area.name}. Serving ${neighborhood.housing_types.slice(0, 2).join(', ')} near ${neighborhood.landmarks[0]}. From $59/hr. 5.0★ Google. ${BUSINESS.phoneDisplay}`
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: BUSINESS.url },
        { name: area.name, url: `${BUSINESS.url}/service-areas/${area.urlSlug}` },
        { name: neighborhood.name, url },
      ],
    }),
    localBusinessSchema(neighborhood, area),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: area.name, url: `${BUSINESS.url}/service-areas/${area.urlSlug}` },
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
    ...reviewSchemas(GOOGLE_REVIEWS.slice(0, 5)),
    // FAQPage is rendered by FAQSection component
  ]
}

export function neighborhoodServicePageSchemas(neighborhood: Neighborhood, service: Service, area: Area) {
  const url = `${BUSINESS.url}/${neighborhood.urlSlug}/${service.slug}`
  const title = `${service.name} in ${neighborhood.name}, ${area.name} From $59/hr | Sunnyside Clean NYC`
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
        { name: area.name, url: `${BUSINESS.url}/service-areas/${area.urlSlug}` },
        { name: neighborhood.name, url: `${BUSINESS.url}/service-areas/${neighborhood.urlSlug}` },
        { name: service.name, url },
      ],
    }),
    localBusinessSchema(neighborhood, area),
    serviceSchema(service, neighborhood, area),
    professionalServiceSchema(service, neighborhood, area),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: area.name, url: `${BUSINESS.url}/service-areas/${area.urlSlug}` },
      { name: neighborhood.name, url: `${BUSINESS.url}/service-areas/${neighborhood.urlSlug}` },
      { name: service.name, url },
    ]),
    howToBookSchema(),
    ...reviewSchemas(GOOGLE_REVIEWS.slice(0, 5)),
    // FAQPage is rendered by FAQSection component
  ]
}

export function servicePageSchemas(service: Service) {
  const url = `${BUSINESS.url}/services/${service.urlSlug}`
  const title = `${service.name} in NYC From ${service.priceRange.split('–')[0]} | 5-Star Rated | Sunnyside Clean NYC`
  const description = `Professional ${service.name.toLowerCase()} across Manhattan, Brooklyn & Queens. ${service.features.slice(0, 3).join(', ')} & more. From ${service.priceRange.split('–')[0]}. 5.0★ Google. ${BUSINESS.phoneDisplay}`
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: BUSINESS.url },
        { name: 'Services', url: `${BUSINESS.url}/nyc-cleaning-services-offered` },
        { name: service.name, url },
      ],
    }),
    localBusinessSchema(),
    serviceSchema(service),
    professionalServiceSchema(service),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: 'Services', url: `${BUSINESS.url}/nyc-cleaning-services-offered` },
      { name: service.name, url },
    ]),
    howToBookSchema(),
    ...reviewSchemas(GOOGLE_REVIEWS.slice(0, 5)),
    // FAQPage is rendered by FAQSection component
  ]
}
