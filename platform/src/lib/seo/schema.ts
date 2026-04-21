import type { Neighborhood } from './locations'
import type { Service } from './services'
import type { Area } from './data/areas'
import { SERVICES } from './services'
import { AREAS } from './data/areas'

const BUSINESS = {
  name: 'The NYC Maid',
  legalName: 'The NYC Maid Cleaning Service LLC',
  url: 'https://www.thenycmaid.com',
  phone: '+1-212-202-9030',
  phoneDisplay: '(212) 202-9030',
  email: 'hi@thenycmaid.com',
  logo: 'https://www.thenycmaid.com/icon-512.png',
  image: 'https://www.thenycmaid.com/icon-512.png',
  priceRange: '$$',
  ratingValue: '4.9',
  ratingCount: '43',
  reviewCount: '43',
  foundingDate: '2018',
  currenciesAccepted: 'USD',
  paymentAccepted: 'Cash, Credit Card, Debit Card, Zelle (hi@thenycmaid.com), Venmo, Apple Pay',
  description: 'Professional house cleaning services across New York City, Long Island, and New Jersey. Deep cleaning, regular apartment cleaning, move-in/move-out, post-construction cleanup, weekly maid service, same-day cleaning, Airbnb turnover, and office cleaning. Licensed, insured, and background-checked cleaners. Serving NYC since 2018.',
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
    'https://www.nycmaid.nyc',
    'https://www.thenycmaidservice.com',
    'https://www.thenewyorkcitymaid.com',
  ],
}

// Verified client reviews (43 total, 4.9 avg — all displayed are 5-star)
const CLIENT_REVIEWS = [
  { text: 'I cannot recommend this company enough! I found myself in a bind and made a last-minute, desperate call at midnight, not expecting much. To my surprise, they answered, were incredibly understanding, and had someone at my door first thing the next morning.', name: 'Desiree Marie', location: 'New York', rating: 5, datePublished: '2026-04-05' },
  { text: 'Gloria did such a wonderful job! Came back to my home smelling fresh and clean. She even cleaned all three of my apartment windows which I didn\'t know she would be doing!', name: 'Cristina Garelli', location: 'New York', rating: 5, datePublished: '2026-04-01' },
  { text: 'Gloria did an incredible job, very thorough, showed up on time, and did not leave until everything was spotless. Jeff was very easy to coordinate with. Highly recommend!', name: 'Hailey', location: 'New York', rating: 5, datePublished: '2026-03-31' },
  { text: 'Pilar was great, she was very friendly, and thorough with her cleaning, definitely recommend!', name: 'Roy Khoury', location: 'New York', rating: 5, datePublished: '2026-03-30' },
  { text: 'Maria did a great job, with a thorough clean of the bathroom and the overall process was very seamless.', name: 'Ofek Inger', location: 'New York', rating: 5, datePublished: '2026-03-23' },
  { text: 'Amazing cleaner and customer service, should\'ve called this company sooner.', name: 'Fanny K.', location: 'New York', rating: 5, datePublished: '2026-03-23' },
  { text: 'Ines Enriquez was incredible. Loved this job. Worth every penny.', name: 'Jessica Pace', location: 'New York', rating: 5, datePublished: '2026-03-16' },
  { text: 'Gloria did an amazing job!! Everything was spotless and perfect, will definitely be using her again!!', name: 'Grayson Esherick', location: 'New York', rating: 5, datePublished: '2026-03-16' },
  { text: 'Karina was absolutely incredible! She was so thorough, fast, efficient, and left my apartment looking better than I could\'ve imagined.', name: 'Gerianne Perez', location: 'New York', rating: 5, datePublished: '2026-03-16' },
  { text: 'I had such a great experience with NYC Maid Cleaning Company. I was in a stressful situation after another cleaning company canceled on me last minute, and NYC Maid was able to fit me in right away.', name: 'Marisa Akson', location: 'New York', rating: 5, datePublished: '2026-03-16' },
  { text: 'Very affordable and professional', name: 'Ana Horsburgh-Emerson', location: 'New York', rating: 5, datePublished: '2026-03-16' },
  { text: 'Fantastic service! On time and very thorough', name: 'David Rold', location: 'New York', rating: 5, datePublished: '2026-03-09' },
  { text: 'Gloria my cleaner was really great! She deep cleaned very well, and the company made sure they got me in a same day fast request!', name: 'Ashley Austin', location: 'New York', rating: 5, datePublished: '2026-03-09' },
  { text: 'Gloria was punctual and came with everything needed. She was thorough and did an excellent job! And always with a smile :)', name: 'Lea Ruivo', location: 'New York', rating: 5, datePublished: '2026-03-02' },
  { text: 'Great service and very communicative & responsive over text. The maid thoroughly cleaned as instructed. Will definitely use again!', name: 'Raahish Kalaria', location: 'New York', rating: 5, datePublished: '2026-03-02' },
  { text: 'Gloria arrived and was professional, thorough, and left my apartment sparkling. I felt such relief walking into a clean home. Will absolutely use them again.', name: 'Kati', location: 'New York', rating: 5, datePublished: '2026-03-02' },
  { text: 'Gloria was amazing! This was our first time using this service and it definitely won\'t be the last. She was super sweet and did such a thorough job.', name: 'Jordan Chacon', location: 'New York', rating: 5, datePublished: '2026-03-02' },
  { text: 'Came on time, efficient and reasonably priced, will definitely be contacting them again if I ever need any more cleaning services', name: 'Ayodele', location: 'New York', rating: 5, datePublished: '2026-03-02' },
  { text: 'Karina just came and cleaned our whole apartment and it was spotless! The rate for the NYC maid was a lot better than other cleaning services I have used for a deep clean.', name: 'Giana Horigan', location: 'New York', rating: 5, datePublished: '2026-03-02' },
  { text: 'Karina was incredible. She was extremely meticulous and left my apt spotless. 10/10; will definitely use again.', name: 'Shannon Atran', location: 'New York', rating: 5, datePublished: '2026-02-23' },
  { text: 'Karina was great and very helpful', name: 'Joseph Busacca', location: 'New York', rating: 5, datePublished: '2026-02-16' },
  { text: 'Awesome cleaners and very responsive. I\'ve used them for several months now for my 3 bed 3 bath walk up in Hell\'s Kitchen. Karina is my cleaner. She is so sweet and warm and lovely.', name: 'Lindsey Hill', location: 'New York', rating: 5, datePublished: '2026-02-16' },
  { text: 'Great job. Friendly and professional.', name: 'Adam Berger', location: 'New York', rating: 5, datePublished: '2026-02-16' },
  { text: 'Great, fast and everything is perfect', name: 'Theo Marx', location: 'New York', rating: 5, datePublished: '2026-02-16' },
  { text: 'Excellent and deep cleaning service. No fuss no nonsense just efficient cleaning.', name: 'V D', location: 'New York', rating: 5, datePublished: '2026-02-09' },
  { text: 'Gloria was great. The place is spotless!', name: 'Ahmad Choudhry', location: 'New York', rating: 5, datePublished: '2026-02-09' },
  { text: 'Fantastic job! Super fast and easy communication and was booked a day before. Will be using them again and recommending to friends :)', name: 'Ella Sultan', location: 'New York', rating: 5, datePublished: '2026-02-09' },
  { text: 'The services was amazing from beginning to end. Not just in quality but also in attitude. We had a deep clean move in and Karina was incredibly thorough.', name: 'Ricky Foschi', location: 'New York', rating: 5, datePublished: '2026-02-02' },
  { text: 'Great experience. Texted the number on their website on Saturday and had a deep cleaning scheduled for that following Monday at 9am. The cleaner was prompt and super nice/friendly.', name: 'Kelsey Wheeler', location: 'New York', rating: 5, datePublished: '2026-02-02' },
  { text: 'Jeff is a real gem. Super communicative easy going and responsive. In a city with a lot of fly by night operations, NYC Maids is the real deal.', name: 'Brad Lieberman', location: 'New York', rating: 5, datePublished: '2026-02-02' },
  { text: 'Fantastic experience with services. Price is affordable for great service. I\'ve been more than happy each time, and staff is very friendly.', name: 'Natalie Pita', location: 'New York', rating: 5, datePublished: '2026-02-02' },
  { text: 'Moving into an apartment clean. Cindy came and cleaned very well. Even cleaned up my living room as bonus. Right on time, fast, easy to book and communicate.', name: 'Eeland Stribling', location: 'New York', rating: 5, datePublished: '2026-01-19' },
  { text: 'What a gift to have found The NYC Maid Cleaning Company and Jeff, the owner! The cleaner did a wonderful job — thorough, detail-oriented, and left everything spotless.', name: 'Kelly Gay', location: 'New York', rating: 5, datePublished: '2026-01-05' },
  { text: 'Gloria was great and very nice. Felt comfortable with her cleaning home.', name: 'Vijay Chadderwala', location: 'New York', rating: 5, datePublished: '2025-12-15' },
  { text: 'Karina was wonderful! She left my home in exceptional condition and I\'m looking forward to having her come again!', name: 'Blair Silver-Matthes', location: 'New York', rating: 5, datePublished: '2025-12-08' },
  { text: 'Needed to get the condo which we just bought a deep clean before moving in. It was amazing to place a phone call and have someone show up the next day. Highly recommend!', name: 'Mona Abdel-Misih', location: 'New York', rating: 5, datePublished: '2025-12-08' },
  { text: 'Maria did an amazing job! My apartment is spotless and she is so easy to work with. Was very happy to accommodate all of my requests.', name: 'Jason Klig', location: 'New York', rating: 5, datePublished: '2025-12-08' },
  { text: 'We hired them for cleaning our offices in Manhattan and no doubt they are the best we ever had. Affordable pricing, staff was friendly and on time.', name: 'Endrit Jonuzi', location: 'New York', rating: 5, datePublished: '2025-12-01' },
  { text: 'I called for an emergency cleaning Jeff took care of it right away. Karina did an amazing job and she\'s incredibly sweet.', name: 'Jessica Papantoniou', location: 'New York', rating: 5, datePublished: '2025-11-24' },
  { text: 'Great service, cleaning, and pricing!', name: 'Erik Berlin', location: 'New York', rating: 5, datePublished: '2025-11-24' },
  { text: 'Maria is the grandmother you didn\'t know you needed. Couldn\'t recommend a more trustworthy and tidy business.', name: 'Will Gags', location: 'New York', rating: 5, datePublished: '2025-11-24' },
  { text: 'Have used NYC Maid twice and have had a great experience both times. Maria was thorough, prompt, and awesome. Highly recommend NYC Maid Cleaning Company.', name: 'Alexandra Spieth', location: 'New York', rating: 5, datePublished: '2025-11-17' },
  { text: 'Service was great and very friendly staff.', name: 'Priya Vadlamudi', location: 'New York', rating: 5, datePublished: '2025-11-17' },
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
  caption: 'The NYC Maid Logo',
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
  { '@type': 'AdministrativeArea' as const, name: 'New Jersey' },
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
      'Maid Service',
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
        urlTemplate: `${BUSINESS.url}/service-areas-served-by-the-nyc-maid?q={search_term_string}`,
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

export function localBusinessSchema(neighborhood?: Neighborhood, area?: Area, opts?: { includeRating?: boolean }) {
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
    hasMap: 'https://maps.google.com/?q=The+NYC+Maid+150+W+47th+St+New+York+NY+10036',
    areaServed,
    serviceArea: serviceAreaObj,
    ...(opts?.includeRating ? { aggregateRating: aggregateRatingObj } : {}),
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
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Deep Cleaning', url: `${BUSINESS.url}/services/deep-cleaning-service-in-nyc` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Regular Apartment Cleaning', url: `${BUSINESS.url}/services/apartment-cleaning-service-in-nyc` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Weekly Maid Service', url: `${BUSINESS.url}/services/weekly-maid-service-in-nyc` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Bi-Weekly Cleaning', url: `${BUSINESS.url}/services/bi-weekly-cleaning-service-in-nyc` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Monthly Cleaning', url: `${BUSINESS.url}/services/monthly-cleaning-service-in-nyc` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Move-In/Move-Out Cleaning', url: `${BUSINESS.url}/services/move-in-move-out-cleaning-service-in-nyc` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Post-Construction Cleanup', url: `${BUSINESS.url}/services/post-construction-cleanup-service-in-nyc` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Same-Day Cleaning', url: `${BUSINESS.url}/services/same-day-cleaning-service-in-nyc` } },
          ],
        },
        {
          '@type': 'OfferCatalog',
          name: 'Commercial Cleaning',
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Office Cleaning', url: `${BUSINESS.url}/services/office-cleaning-service-in-nyc` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Airbnb & Short-Term Rental Cleaning', url: `${BUSINESS.url}/services/airbnb-cleaning-in-nyc` } },
          ],
        },
      ],
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
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '75.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' },
      },
      {
        '@type': 'Offer',
        name: 'Same-Day / Emergency',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: '100.00', priceCurrency: 'USD', unitCode: 'HUR', unitText: 'per hour' },
      },
    ],
    review: CLIENT_REVIEWS.slice(0, 5).map(r => ({
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
          urlTemplate: `${BUSINESS.url}/contact-the-nyc-maid-service-today`,
          actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'],
        },
        result: { '@type': 'Reservation', name: 'Book Cleaning Service' },
      },
      {
        '@type': 'OrderAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BUSINESS.url}/contact-the-nyc-maid-service-today`,
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
    termsOfService: `${BUSINESS.url}/terms-conditions`,
    audience: {
      '@type': 'Audience',
      audienceType: service.idealFor.join(', '),
    },
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BUSINESS.url}/contact-the-nyc-maid-service-today`,
        actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/IOSPlatform', 'http://schema.org/AndroidPlatform'],
      },
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
          price: '75.00',
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

export function reviewSchemas(reviews?: typeof CLIENT_REVIEWS) {
  const r = reviews || CLIENT_REVIEWS
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
    publisher: { '@type': 'Organization', name: 'The NYC Maid' },
  }))
}

// ================================================================
// REVIEWS PAGE — LocalBusiness with nested reviews + aggregateRating
// Gives Google the clearest possible signal to show star snippets
// ================================================================

export function reviewsPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: BUSINESS.name,
    url: BUSINESS.url,
    telephone: BUSINESS.phone,
    image: BUSINESS.image,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.state,
      postalCode: BUSINESS.address.zip,
      addressCountry: BUSINESS.address.country,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: BUSINESS.ratingValue,
      reviewCount: BUSINESS.reviewCount,
      ratingCount: BUSINESS.ratingCount,
      bestRating: '5',
      worstRating: '1',
    },
    review: CLIENT_REVIEWS.filter(r => r.text).map(review => ({
      '@type': 'Review',
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
    })),
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
      { '@type': 'WebPage', name: 'Contact', url: `${BUSINESS.url}/contact-the-nyc-maid-service-today`, position: 1 },
      { '@type': 'WebPage', name: 'Services', url: `${BUSINESS.url}/nyc-maid-service-services-offered-by-the-nyc-maid`, position: 2 },
      { '@type': 'WebPage', name: 'Pricing', url: `${BUSINESS.url}/updated-nyc-maid-service-industry-pricing`, position: 3 },
      { '@type': 'WebPage', name: 'Service Areas', url: `${BUSINESS.url}/service-areas-served-by-the-nyc-maid`, position: 4 },
      { '@type': 'WebPage', name: 'Reviews', url: `${BUSINESS.url}/reviews`, position: 5 },
      { '@type': 'WebPage', name: 'Now Hiring Cleaners', url: `${BUSINESS.url}/available-nyc-maid-jobs`, position: 6 },
      { '@type': 'WebPage', name: 'Contact', url: `${BUSINESS.url}/contact-the-nyc-maid-service-today`, position: 7 },
      { '@type': 'WebPage', name: 'FAQ', url: `${BUSINESS.url}/nyc-cleaning-service-frequently-asked-questions-in-2025`, position: 8 },
      { '@type': 'WebPage', name: 'About', url: `${BUSINESS.url}/about-the-nyc-maid-service-company`, position: 9 },
      { '@type': 'WebPage', name: 'Blog & Tips', url: `${BUSINESS.url}/nyc-maid-service-blog`, position: 10 },
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
    name: 'How to Book a Cleaning Service with The NYC Maid',
    description: 'Book a professional cleaning in just 3 simple steps.',
    totalTime: 'PT5M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '49' },
    step: [
      {
        '@type': 'HowToStep',
        name: 'Contact Us',
        text: 'Text (212) 202-9030 to schedule your cleaning.',
        url: `${BUSINESS.url}/contact-the-nyc-maid-service-today`,
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
    name: 'Cleaning Services Offered by The NYC Maid',
    description: 'Complete list of professional cleaning services available across NYC, Long Island, and New Jersey.',
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
    name: 'Service Areas Covered by The NYC Maid',
    description: 'We serve over 225 neighborhoods across NYC, Long Island, and New Jersey.',
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
    name: `${service.name}${neighborhood ? ` in ${neighborhood.name}` : ''} - The NYC Maid`,
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
// VIDEO OBJECTS (client review videos on homepage + /reviews)
// ================================================================

const VIDEO_REVIEW_UPLOAD_DATE = '2026-02-15'

export function videoReviewsSchemas() {
  const videos = [
    { id: 'review-1', title: 'NYC Cleaning Client Review — Manhattan Apartment', description: 'Real client testimonial from a verified NYC apartment cleaning booked with The NYC Maid.' },
    { id: 'review-2', title: 'NYC Cleaning Client Review — Brooklyn Home', description: 'Brooklyn client shares their honest experience with professional deep cleaning from The NYC Maid.' },
    { id: 'review-3', title: 'NYC Cleaning Client Review — Weekly Maid Service', description: 'Weekly maid service client reviews on-camera their recurring cleaning experience in New York City.' },
  ]
  return videos.map(v => ({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: v.title,
    description: v.description,
    thumbnailUrl: `${BUSINESS.url}/icon-512.png`,
    uploadDate: VIDEO_REVIEW_UPLOAD_DATE,
    contentUrl: `${BUSINESS.url}/videos/${v.id}.mp4`,
    publisher: orgRef,
    inLanguage: 'en-US',
    isFamilyFriendly: true,
    hasPart: [],
  }))
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
      name: 'NYC Maid Service & House Cleaning From $59/hr | 5-Star Rated | The NYC Maid',
      description: BUSINESS.description,
      type: 'WebPage',
      speakable: ['h1', '.hero-description'],
      breadcrumb: [{ name: 'Home', url }],
    }),
    localBusinessSchema(undefined, undefined, { includeRating: true }),
    pricingOffersSchema(),
    serviceItemListSchema(),
    areaItemListSchema(),
    siteNavigationSchema(),
    howToBookSchema(),
  ]
}

export function areaPageSchemas(area: Area) {
  const url = `${BUSINESS.url}/${area.urlSlug}`
  const title = `${area.name} Maid Service & House Cleaning From $59/hr | The NYC Maid`
  const description = `Professional house cleaning in ${area.name} from $59/hr. Deep cleaning, weekly maid service, move-in/out & more. Licensed, insured, 5.0★ Rated. ${BUSINESS.phoneDisplay}`
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
  const title = `${neighborhood.name} Maid Service & House Cleaning From $59/hr | The NYC Maid`
  const description = `Professional cleaning in ${neighborhood.name}, ${area.name}. Serving ${neighborhood.housing_types.slice(0, 2).join(', ')} near ${neighborhood.landmarks[0]}. From $59/hr. 5.0★ Rated. ${BUSINESS.phoneDisplay}`
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
  const title = `${service.name} in ${neighborhood.name}, ${area.name} From $59/hr | The NYC Maid`
  const description = `Professional ${service.name.toLowerCase()} in ${neighborhood.name}, ${area.name}. ${service.features.slice(0, 3).join(', ')} & more. ${service.priceRange}. 5.0★ Rated. ${BUSINESS.phoneDisplay}`
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
  const title = `${service.name} in NYC From ${service.priceRange.split('–')[0]} | 5-Star Rated | The NYC Maid`
  const description = `Professional ${service.name.toLowerCase()} across Manhattan, Brooklyn, Queens, Long Island & NJ. ${service.features.slice(0, 3).join(', ')} & more. From ${service.priceRange.split('–')[0]}. 5.0★ Rated. ${BUSINESS.phoneDisplay}`
  return [
    organizationSchema(),
    webSiteSchema(),
    webPageSchema({
      url,
      name: title,
      description,
      breadcrumb: [
        { name: 'Home', url: BUSINESS.url },
        { name: 'Services', url: `${BUSINESS.url}/nyc-maid-service-services-offered-by-the-nyc-maid` },
        { name: service.name, url },
      ],
    }),
    localBusinessSchema(),
    serviceSchema(service),
    professionalServiceSchema(service),
    breadcrumbSchema([
      { name: 'Home', url: BUSINESS.url },
      { name: 'Services', url: `${BUSINESS.url}/nyc-maid-service-services-offered-by-the-nyc-maid` },
      { name: service.name, url },
    ]),
    howToBookSchema(),
  ]
}
