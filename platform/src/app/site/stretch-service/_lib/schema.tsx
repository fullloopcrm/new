// @ts-nocheck
import { SITE_URL, SITE_NAME, SITE_PHONE, SITE_EMAIL } from "./siteData";

/* ─── Core Organization Schema (HealthAndBeautyBusiness + ProfessionalService) ─── */

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["HealthAndBeautyBusiness", "ProfessionalService"],
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: "Stretch nationwide",
  legalName: "Stretch Service",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/logo.png`,
    width: 600,
    height: 60,
  },
  image: `${SITE_URL}/og-image.jpg`,
  description:
    "Stretch Service is nationwide's premier mobile assisted stretch service. Our certified stretch therapists bring professional flexibility and rehabilitation therapy directly to your home, office, hotel, or any nationwide location. Serving all 50 states: cities nationwide. $99 per hour. 10% off weekly sessions.",
  slogan: "nationwide's #1 Mobile Stretch Service — $99/Hour",
  foundingDate: "2021",
  foundingLocation: {
    "@type": "Place",
    name: "nationwide, NY",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "Nationwide Mobile Service",
    addressLocality: "Nationwide",
    addressRegion: "US",
    postalCode: "",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 39.8283,
    longitude: -98.5795,
  },
  telephone: "+1-(888) 734-7274",
  email: SITE_EMAIL,
  priceRange: "$99/hour",
  currenciesAccepted: "USD",
  paymentAccepted: "Cash, Credit Card, Venmo, Zelle, CashApp",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    ratingCount: "31",
    reviewCount: "31",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Angel Reyes" },
      datePublished: "2025-01-15",
      reviewBody: "I cannot say enough great things about Stretch Service! After undergoing surgery to repair a partially torn Achilles tendon, my trainer William was exceptional. With his guidance, I regained not only my strength and conditioning, but also my stamina and mobility.",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Dan Anghelescu" },
      datePublished: "2025-02-10",
      reviewBody: "Game-changer for our whole family. Will has had extraordinary impact. His ability to tailor sessions to both adults and children is nothing short of extraordinary. He combines deep anatomical knowledge with intuitive adjustments.",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Paula Stephenson" },
      datePublished: "2025-03-05",
      reviewBody: "My experience was amazing. Will is knowledgeable, easy to talk to and caring. I felt relief from the many discomforts I had. My body felt better right after. I will definitely continue with my sessions.",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Kristina Cabral" },
      datePublished: "2025-04-20",
      reviewBody: "Kelly is excellent. Professional and efficient. As an active softball player I can say I've never slept so peacefully after. Was extremely relieved and was more than what I expected. Worth every penny!",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Michael Torres" },
      datePublished: "2025-05-12",
      reviewBody: "Best investment in my health I've made in years. The therapist came right to my office, super professional setup. After years of lower back pain from sitting at a desk, I finally have relief.",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
    },
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+1-(888) 734-7274",
      contactType: "customer service",
      contactOption: ["TollFree"],
      areaServed: "US",
      availableLanguage: ["English", "Spanish"],
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "07:00",
        closes: "22:00",
      },
    },
    {
      "@type": "ContactPoint",
      telephone: "+1-(888) 734-7274",
      contactType: "sales",
      contactOption: ["TollFree"],
      areaServed: "US",
      availableLanguage: ["English"],
    },
    {
      "@type": "ContactPoint",
      email: SITE_EMAIL,
      contactType: "customer support",
      areaServed: "US",
    },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "07:00",
      closes: "22:00",
    },
  ],
  areaServed: [
    { "@type": "City", name: "New York", containedInPlace: { "@type": "State", name: "New York" } },
    { "@type": "AdministrativeArea", name: "Manhattan, New York" },
    { "@type": "AdministrativeArea", name: "Brooklyn, New York" },
    { "@type": "AdministrativeArea", name: "Queens, New York" },
    { "@type": "AdministrativeArea", name: "Bronx, New York" },
    { "@type": "AdministrativeArea", name: "Staten Island, New York" },
  ],
  serviceArea: {
    "@type": "GeoCircle",
    geoMidpoint: { "@type": "GeoCoordinates", latitude: 40.7128, longitude: -74.0060 },
    geoRadius: "50000",
  },
  knowsAbout: [
    "Assisted Stretching",
    "PNF Stretching",
    "Proprioceptive Neuromuscular Facilitation",
    "Myofascial Release",
    "Sports Recovery Stretching",
    "Mobile Stretch Service",
    "Corporate Wellness Programs",
    "Senior Mobility Stretching",
    "Flexibility Training",
    "Active Stretching",
    "Dynamic Stretching",
    "Passive Stretching",
    "Static Stretching",
    "Foam Rolling Therapy",
    "Recovery Stretching",
    "Ballistic Stretching",
    "Hotel Room Stretching Service",
    "Post-Surgery Rehabilitation Stretching",
    "nationwide Tourist Recovery Stretching",
    "Chronic Pain Management through Stretching",
  ],
  sameAs: [
    "https://www.instagram.com/stretchservice",
    "https://www.google.com/maps/place/Stretch+nationwide",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Stretch Service Mobile Stretch Services",
    itemListElement: [
      {
        "@type": "Offer",
        name: "60-Minute Mobile Stretch Service",
        itemOffered: {
          "@type": "Service",
          name: "60-Minute Assisted Stretch Service",
          description: "Full-body comprehensive stretch service with mobility assessment, professional equipment, and personalized treatment plan delivered to your nationwide location.",
          serviceType: "Assisted Stretching",
        },
        price: "99.00",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        eligibleRegion: { "@type": "Place", name: "nationwide" },
      },
      {
        "@type": "Offer",
        name: "Weekly Stretch Service Program",
        itemOffered: {
          "@type": "Service",
          name: "Weekly Mobile Stretch Service Program",
          description: "Consistent weekly stretch service sessions with priority scheduling, same therapist continuity, and 10% savings for best results.",
          serviceType: "Assisted Stretching",
        },
        price: "89.00",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        eligibleRegion: { "@type": "Place", name: "nationwide" },
      },
      {
        "@type": "Offer",
        name: "Corporate Stretch Service Program",
        itemOffered: {
          "@type": "Service",
          name: "Corporate Wellness Stretch Service",
          description: "On-site corporate wellness stretch service programs for nationwide offices. Reduce workplace injuries, boost productivity, and improve employee morale.",
          serviceType: "Corporate Wellness",
        },
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        eligibleRegion: { "@type": "Place", name: "nationwide" },
      },
    ],
  },
};

/* ─── Website Schema with SearchAction ─── */

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  alternateName: "Stretch Service Mobile Stretch Service",
  description: "nationwide Mobile Assisted Stretch Service — Professional stretch service delivered to your home, office, hotel, or any location across nationwide. $99/hour. 10% off weekly.",
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
  inLanguage: "en-US",
  copyrightYear: "2021",
  copyrightHolder: { "@id": `${SITE_URL}/#organization` },
};

/* ─── SiteNavigationElement Schema ─── */

export const navigationSchema = {
  "@context": "https://schema.org",
  "@type": "SiteNavigationElement",
  name: "Main Navigation",
  url: SITE_URL,
  hasPart: [
    { "@type": "WebPage", name: "Services", url: `${SITE_URL}/services` },
    { "@type": "WebPage", name: "Locations", url: `${SITE_URL}/locations` },
    { "@type": "WebPage", name: "Parks", url: `${SITE_URL}/parks` },
    { "@type": "WebPage", name: "Pricing", url: `${SITE_URL}/pricing` },
    { "@type": "WebPage", name: "Hotel Stretch Service", url: `${SITE_URL}/hotel-stretching` },
    { "@type": "WebPage", name: "Corporate Wellness", url: `${SITE_URL}/corporate-wellness` },
    { "@type": "WebPage", name: "FAQ", url: `${SITE_URL}/faq` },
    { "@type": "WebPage", name: "About", url: `${SITE_URL}/about` },
    { "@type": "WebPage", name: "Contact", url: `${SITE_URL}/contact` },
    { "@type": "WebPage", name: "Jobs", url: `${SITE_URL}/jobs` },
  ],
};

/* ─── HowTo Schema (How Our Stretch Service Works) ─── */

export const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Book a Mobile Stretch Service in nationwide",
  description: "Book a professional mobile stretch service in nationwide in 4 simple steps. Our certified stretch therapists come to your home, office, hotel, or any nationwide location.",
  totalTime: "PT2M",
  estimatedCost: {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: "99",
  },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Text or Call Us",
      text: "Text or call (888) 734-7274 with your preferred date, time, and location anywhere in nationwide.",
      url: `${SITE_URL}/#how-it-works`,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "We Confirm Your Appointment",
      text: "We confirm your stretch service appointment and assign a certified stretch therapist in your nationwide neighborhood.",
      url: `${SITE_URL}/#how-it-works`,
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Your Therapist Arrives",
      text: "Your certified stretch therapist arrives at your location with all professional equipment — massage table, mats, straps, and tools.",
      url: `${SITE_URL}/#how-it-works`,
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Feel Amazing",
      text: "Enjoy a 60-minute professional stretch service session. Feel immediate relief, improved flexibility, and reduced pain.",
      url: `${SITE_URL}/#how-it-works`,
    },
  ],
};

/* ─── ItemList Schema for Services ─── */

export function serviceListSchema(serviceItems: { name: string; url: string; description: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "nationwide Mobile Stretch Services",
    description: "All professional stretch service types offered by Stretch Service across nationwide.",
    numberOfItems: serviceItems.length,
    itemListElement: serviceItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
      description: item.description,
    })),
  };
}

/* ─── ItemList Schema for Neighborhoods ─── */

export function neighborhoodListSchema(boroughName: string, items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${boroughName} Stretch Service Neighborhoods`,
    description: `All ${boroughName} neighborhoods served by Stretch Service mobile stretch service.`,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${item.name} Stretch Service`,
      url: item.url,
    })),
  };
}

/* ─── JobPosting Schema ─── */

export function jobPostingSchema(locationName?: string, borough?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: locationName
      ? `Mobile Stretch Therapist — ${locationName}, ${borough}`
      : "Mobile Stretch Therapist — nationwide",
    description: "Part-time mobile stretch therapist position with Stretch Service. Provide professional assisted stretch service to clients at their homes, offices, hotels, and public spaces across nationwide. $50/hour starting pay. Flexible scheduling 7AM-10PM. Fast payment within 30 minutes of session completion.",
    // Computed at render time; the refresh-job-postings cron re-renders
    // daily so Google for Jobs always sees a recent datePosted (~2 days).
    datePosted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    validThrough: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    employmentType: "PART_TIME",
    hiringOrganization: {
      "@id": `${SITE_URL}/#organization`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: locationName || "New York",
        addressRegion: "US",
        addressCountry: "US",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        value: 50,
        unitText: "HOUR",
      },
    },
    jobBenefits: "Flexible scheduling, fast payment within 30 minutes, established client base, no marketing or sales required",
    skills: "Assisted stretching, PNF stretching, myofascial release, sports recovery, client communication",
    qualifications: "Certified stretch therapist or equivalent experience. Must carry own padded yoga mat. Must be in nationwide.",
    industry: "Health and Wellness",
    occupationalCategory: "31-9011.00",
  };
}

/* ─── Page Schemas ─── */

export function neighborhoodPageSchema(neighborhood: string, borough: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/locations/${borough.toLowerCase().replace(/\s+/g, "-")}/${neighborhood.toLowerCase().replace(/\s+/g, "-")}/#webpage`,
    name: `${neighborhood} Stretch Service — Mobile Stretching in ${neighborhood}, ${borough} | ${SITE_NAME}`,
    description: `Professional mobile stretch service in ${neighborhood}, ${borough}. Certified stretch therapists come to your location. $99/hour. 10% off weekly. Same-day available.`,
    url: `${SITE_URL}/locations/${borough.toLowerCase().replace(/\s+/g, "-")}/${neighborhood.toLowerCase().replace(/\s+/g, "-")}`,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", ".hero-description"],
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function webPageSchema(
  title: string,
  description: string,
  url: string,
  breadcrumbs?: { name: string; url: string }[]
) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}/#webpage`,
    url,
    name: title,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    datePublished: "2025-01-01",
    dateModified: new Date().toISOString().split("T")[0],
    inLanguage: "en-US",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2"],
    },
  };

  if (breadcrumbs) {
    schema.breadcrumb = breadcrumbSchema(breadcrumbs);
  }

  return schema;
}

export function serviceSchema(serviceName: string, serviceDesc: string, url: string, areaName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}/#service`,
    name: areaName ? `${serviceName} Stretch Service in ${areaName}` : `${serviceName} Stretch Service in nationwide`,
    description: serviceDesc,
    provider: {
      "@id": `${SITE_URL}/#organization`,
    },
    areaServed: areaName
      ? {
          "@type": "Place",
          name: areaName,
          containedInPlace: { "@type": "City", name: "New York" },
        }
      : {
          "@type": "City",
          name: "New York",
          containedInPlace: { "@type": "State", name: "New York" },
        },
    serviceType: "Mobile Stretch Service",
    category: "Health and Wellness",
    url,
    offers: [
      {
        "@type": "Offer",
        name: "Single Session",
        price: "99.00",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        eligibleRegion: { "@type": "Place", name: "nationwide" },
        description: "60-minute mobile stretch service session. Professional equipment included.",
      },
      {
        "@type": "Offer",
        name: "Weekly Program (10% Off)",
        price: "89.00",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        eligibleRegion: { "@type": "Place", name: "nationwide" },
        description: "Weekly stretch service program with priority scheduling and same therapist continuity.",
      },
    ],
    termsOfService: `${SITE_URL}/terms`,
    providerMobility: "dynamic",
    audience: {
      "@type": "Audience",
      audienceType: "nationwide residents, tourists, athletes, desk workers, seniors, corporate teams",
    },
  };
}

export function localBusinessSchema(areaName: string, borough: string) {
  return {
    "@context": "https://schema.org",
    "@type": ["HealthAndBeautyBusiness", "ProfessionalService"],
    "@id": `${SITE_URL}/#business-${areaName.toLowerCase().replace(/\s+/g, "-")}`,
    name: `${SITE_NAME} — ${areaName} Stretch Service`,
    description: `Professional mobile stretch service in ${areaName}, ${borough}, nationwide. Certified therapists come to your home, office, or hotel. $99/hour. 10% off weekly. 7AM-10PM daily. Same-day appointments available.`,
    url: SITE_URL,
    telephone: "+1-(888) 734-7274",
    image: `${SITE_URL}/og-image.jpg`,
    priceRange: "$99/hour",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Nationwide Mobile Service",
      addressLocality: "Nationwide",
      addressRegion: "US",
      postalCode: "",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 39.8283,
      longitude: -98.5795,
    },
    areaServed: {
      "@type": "Place",
      name: `${areaName}, ${borough}`,
      containedInPlace: {
        "@type": "City",
        name: "New York",
      },
    },
    parentOrganization: {
      "@id": `${SITE_URL}/#organization`,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      reviewCount: "31",
      bestRating: "5",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "07:00",
        closes: "22:00",
      },
    ],
  };
}

export function parkSchema(parkName: string, borough: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: `Outdoor Stretch Service at ${parkName}`,
    description: `${description} Professional mobile stretch service available at ${parkName}, ${borough}. Our certified stretch therapists meet you at this iconic nationwide location with all equipment. $99/hour.`,
    url,
    touristType: ["Wellness Tourist", "Health Tourist", "Active Tourist", "Family Tourist"],
    availableAtOrFrom: {
      "@id": `${SITE_URL}/#organization`,
    },
    isAccessibleForFree: false,
    publicAccess: true,
    geo: {
      "@type": "GeoCoordinates",
      addressCountry: "US",
      addressRegion: "US",
      addressLocality: borough,
    },
    offers: {
      "@type": "Offer",
      name: "Outdoor Stretch Service Session",
      price: "99.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
}

/* ─── Article Schema (for guide/blog pages) ─── */

export function articleSchema(
  title: string,
  description: string,
  url: string,
  datePublished: string,
  dateModified?: string,
  image?: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: image || `${SITE_URL}/og-image.jpg`,
    datePublished,
    dateModified: dateModified || new Date().toISOString().split("T")[0],
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "en-US",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "h3"],
    },
  };
}

/* ─── MedicalWebPage Schema (for health content) ─── */

export function medicalWebPageSchema(
  title: string,
  description: string,
  url: string,
  conditions?: string[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: title,
    description,
    url,
    lastReviewed: new Date().toISOString().split("T")[0],
    reviewedBy: { "@id": `${SITE_URL}/#organization` },
    about: conditions
      ? conditions.map((c) => ({
          "@type": "MedicalCondition",
          name: c,
        }))
      : undefined,
    audience: {
      "@type": "MedicalAudience",
      audienceType: "Patient",
    },
    specialty: {
      "@type": "MedicalSpecialty",
      name: "Musculoskeletal Medicine",
    },
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

/* ─── CollectionPage Schema (for index/listing pages) ─── */

export function collectionPageSchema(
  title: string,
  description: string,
  url: string,
  numberOfItems: number
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url,
    numberOfItems,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
  };
}

/* ─── AboutPage Schema ─── */

export const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${SITE_NAME}`,
  description: "Learn about Stretch Service — nationwide's #1 assisted stretch service. Our story, mission, team, and commitment to making professional stretch service accessible across all five nationwide boroughs.",
  url: `${SITE_URL}/about`,
  mainEntity: { "@id": `${SITE_URL}/#organization` },
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
};

/* ─── ContactPage Schema ─── */

export const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: `Contact ${SITE_NAME}`,
  description: "Contact Stretch Service for assisted stretch service. Text or call (888) 734-7274. $99/hr, same-day available across all nationwide boroughs.",
  url: `${SITE_URL}/contact`,
  mainEntity: { "@id": `${SITE_URL}/#organization` },
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
};

/* ─── Product Schema (stretch service as purchasable product) ─── */

export const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "nationwide Assisted Stretch Service Session",
  description: "60-minute professional assisted stretch service delivered to your home, office, hotel, or any nationwide location. Includes full-body mobility assessment, PNF stretching, myofascial release, and personalized treatment plan. All professional equipment provided.",
  brand: { "@id": `${SITE_URL}/#organization` },
  image: `${SITE_URL}/og-image.jpg`,
  url: `${SITE_URL}/pricing`,
  category: "Health & Wellness Services",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "31",
    bestRating: "5",
    worstRating: "1",
  },
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "89.00",
    highPrice: "99.00",
    priceCurrency: "USD",
    offerCount: "3",
    offers: [
      {
        "@type": "Offer",
        name: "Single 60-Minute Stretch Service Session",
        price: "99.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        priceValidUntil: "2027-12-31",
        url: `${SITE_URL}/pricing`,
        seller: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Offer",
        name: "Weekly Stretch Service Program (10% Off)",
        price: "89.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        priceValidUntil: "2027-12-31",
        url: `${SITE_URL}/pricing`,
        seller: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Offer",
        name: "Corporate Group Stretch Service",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/corporate-wellness`,
        description: "Custom pricing for corporate and group stretch service programs.",
        seller: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  },
};

/* ─── Course Schema (for Stretching 101 guide) ─── */

export const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Stretching 101 — The Complete Guide to Professional Stretch Service",
  description: "Free comprehensive stretching guide covering daily routines by age group, stretch techniques, nutrition for flexibility, recovery protocols, and when to use professional stretch service. By Stretch Service.",
  url: `${SITE_URL}/stretching-101`,
  provider: { "@id": `${SITE_URL}/#organization` },
  isAccessibleForFree: true,
  educationalLevel: "Beginner to Advanced",
  audience: {
    "@type": "Audience",
    audienceType: "General Public, Athletes, Seniors, Desk Workers, Tourists",
  },
  inLanguage: "en-US",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "Online",
    courseWorkload: "Self-paced reading",
  },
  about: [
    { "@type": "Thing", name: "Assisted Stretching" },
    { "@type": "Thing", name: "PNF Stretching" },
    { "@type": "Thing", name: "Flexibility Training" },
    { "@type": "Thing", name: "Myofascial Release" },
    { "@type": "Thing", name: "Sports Recovery" },
    { "@type": "Thing", name: "Senior Mobility" },
    { "@type": "Thing", name: "Nutrition for Flexibility" },
  ],
};

/* ─── Event Schema (for corporate/group events) ─── */

export function eventSchema(eventName: string, locationName: string, borough: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventName,
    description: `Professional group stretch service event in ${locationName}, ${borough}. Certified therapists provide on-site assisted stretching for teams, corporate groups, and special events.`,
    organizer: { "@id": `${SITE_URL}/#organization` },
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: locationName,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Nationwide",
        addressRegion: "US",
        addressCountry: "US",
      },
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      description: "Custom pricing based on group size and duration.",
      url: `${SITE_URL}/corporate-wellness`,
    },
    performer: { "@id": `${SITE_URL}/#organization` },
  };
}

/* ─── ExerciseAction Schema (for stretching guide content) ─── */

export function exerciseActionSchema(exerciseName: string, targetMuscle: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ExerciseAction",
    name: exerciseName,
    exerciseType: "Stretching",
    target: {
      "@type": "MuscleAction",
      name: targetMuscle,
    },
    agent: { "@id": `${SITE_URL}/#organization` },
    url,
    description: `Professional ${exerciseName} targeting the ${targetMuscle}. Part of Stretch Service's assisted stretch service program.`,
  };
}

/* ─── MedicalCondition Schema (for pain-related content) ─── */

export function medicalConditionSchema(conditionName: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: conditionName,
    description,
    url,
    possibleTreatment: {
      "@type": "MedicalTherapy",
      name: "Professional Assisted Stretch Service",
      description: `Professional stretch service for ${conditionName} management. Certified therapists use PNF stretching and myofascial release to address ${conditionName} at its root cause. $99/hr mobile service across nationwide.`,
      drug: [],
      seriousAdverseOutcome: [],
    },
    signOrSymptom: {
      "@type": "MedicalSignOrSymptom",
      name: `${conditionName} symptoms`,
    },
    riskFactor: {
      "@type": "MedicalRiskFactor",
      name: "Sedentary lifestyle, desk work, nationwide commuting",
    },
  };
}

/* ─── VideoObject Schema (placeholder for future video content) ─── */

export function videoSchema(title: string, description: string, url: string, thumbnailUrl?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description,
    url,
    thumbnailUrl: thumbnailUrl || `${SITE_URL}/og-image.jpg`,
    uploadDate: new Date().toISOString().split("T")[0],
    publisher: { "@id": `${SITE_URL}/#organization` },
    contentUrl: url,
    embedUrl: url,
    inLanguage: "en-US",
  };
}

/* ─── ProfilePage Schema (for careers/team page) ─── */

export const profilePageSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  name: `Join ${SITE_NAME} — Stretch Therapist Careers`,
  description: "Career opportunities at Stretch Service. $50/hr part-time mobile stretch therapist positions across all nationwide boroughs.",
  url: `${SITE_URL}/jobs`,
  mainEntity: { "@id": `${SITE_URL}/#organization` },
  isPartOf: { "@id": `${SITE_URL}/#website` },
};

/* ─── SpecialAnnouncement Schema (for promotions/discounts) ─── */

export const discountAnnouncementSchema = {
  "@context": "https://schema.org",
  "@type": "SpecialAnnouncement",
  name: "Stretch Service Discounts & Savings",
  text: "Save on professional assisted stretch service: 10% off weekly programs ($89/session instead of $99), community discounts for seniors, veterans, NYPD/NYFD, and emergency services, plus 10% recurring referral rewards on every session your referrals book.",
  datePosted: "2025-01-01",
  url: `${SITE_URL}/discounts`,
  announcementLocation: {
    "@type": "City",
    name: "New York",
    containedInPlace: { "@type": "State", name: "New York" },
  },
  category: "https://www.wikidata.org/wiki/Q81307",
};

/* ─── JsonLd Component ─── */

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
