import { PHONE, EMAIL, TESTIMONIALS } from "@/app/site/theroadsidehelper/_data/content";
import { SERVICES } from "@/app/site/theroadsidehelper/_data/services";

const SITE_URL = "https://www.theroadsidehelper.com";
const BUSINESS_NAME = "The Roadside Helper";

// ============================================================
// Organization schema (separate identity for parent brand)
// ============================================================
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BUSINESS_NAME,
    legalName: BUSINESS_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon`,
      width: "512",
      height: "512",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: PHONE,
        contactType: "customer service",
        areaServed: "US",
        availableLanguage: ["en"],
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          opens: "00:00",
          closes: "23:59",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        },
      },
      {
        "@type": "ContactPoint",
        telephone: PHONE,
        contactType: "emergency",
        areaServed: "US",
        availableLanguage: ["en"],
      },
    ],
    sameAs: [],
  };
}

// ============================================================
// WebSite schema (with SearchAction for sitelinks search box)
// ============================================================
export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS_NAME,
    description: "24/7 nationwide roadside assistance. Flat $149/hr, no membership.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/locations?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ============================================================
// LocalBusiness / AutomotiveBusiness schema for the org
// ============================================================
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["AutomotiveBusiness", "EmergencyService"],
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS_NAME,
    legalName: BUSINESS_NAME,
    description: "24/7 nationwide roadside assistance. Jump-starts, flat tire changes, lockouts, fuel delivery, towing, and winch-outs. Flat $149/hr, 1-hour minimum, no membership.",
    url: SITE_URL,
    telephone: PHONE,
    email: EMAIL,
    priceRange: "$149/hr",
    paymentAccepted: ["Cash", "Credit Card", "Debit Card", "Apple Pay", "Google Pay", "Venmo", "Zelle", "CashApp"],
    currenciesAccepted: "USD",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    areaServed: { "@type": "Country", name: "United States" },
    address: {
      "@type": "PostalAddress",
      addressCountry: "US",
      addressRegion: "Nationwide",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "39.8283",
      longitude: "-98.5795",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: PHONE,
      contactType: "emergency",
      areaServed: "US",
      availableLanguage: "en",
    },
    review: TESTIMONIALS.map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.name },
      reviewRating: {
        "@type": "Rating",
        ratingValue: t.rating,
        bestRating: 5,
      },
      reviewBody: t.text,
      datePublished: "2026-01-01",
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Roadside Assistance Services",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.title,
          description: s.description,
          url: `${SITE_URL}/services/${s.slug}`,
        },
        price: "100",
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "100",
          priceCurrency: "USD",
          unitText: "hour",
        },
      })),
    },
    knowsAbout: SERVICES.map((s) => s.title),
    sameAs: [],
  };
}

// ============================================================
// Service schema for individual service pages
// ============================================================
export function serviceSchema(args: { name: string; description: string; slug: string; subtitle: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: args.name,
    provider: { "@id": `${SITE_URL}/#business` },
    name: args.name,
    description: args.description,
    url: `${SITE_URL}/services/${args.slug}`,
    areaServed: { "@type": "Country", name: "United States" },
    audience: { "@type": "Audience", audienceType: "Drivers, Fleet Operators, Commuters" },
    offers: {
      "@type": "Offer",
      price: "100",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "100",
        priceCurrency: "USD",
        unitText: "hour",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitText: "hour" },
      },
      availability: "https://schema.org/InStock",
      eligibleRegion: { "@type": "Country", name: "United States" },
    },
  };
}

// ============================================================
// HowTo schema for service pages — describes the "how it works" flow
// ============================================================
export function howToSchema(args: { name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Get ${args.name} from The Roadside Helper`,
    description: args.description,
    totalTime: "PT1H",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: "100",
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Call or text",
        text: `Call ${PHONE} or text the same number. A real dispatcher answers — no menus. Tell us your location, vehicle, and the problem.`,
        url: `${SITE_URL}/book-roadside-help-now#step-1`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Get an ETA",
        text: "The nearest technician calls back with an arrival estimate, typically under an hour. You'll get a text with the technician's name and ETA.",
        url: `${SITE_URL}/book-roadside-help-now#step-2`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "We arrive and solve it",
        text: `The technician confirms the situation, walks you through the fix, and gets to work. ${args.name} jobs usually finish inside the 1-hour minimum.`,
        url: `${SITE_URL}/book-roadside-help-now#step-3`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Pay flat $149/hr",
        text: "Digital invoice on your phone — flat $149/hr, no trip fees, no surcharges. Card, Apple Pay, Google Pay, Venmo, Zelle, CashApp, or cash all accepted.",
        url: `${SITE_URL}/book-roadside-help-now#step-4`,
      },
    ],
  };
}

// ============================================================
// FAQPage schema for FAQ pages
// ============================================================
export function faqSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// ============================================================
// BlogPosting schema for blog posts
// ============================================================
export function blogPostSchema(args: { slug: string; title: string; excerpt: string; date: string; content: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: args.title,
    description: args.excerpt,
    url: `${SITE_URL}/blog/${args.slug}`,
    datePublished: args.date,
    dateModified: args.date,
    author: { "@type": "Organization", name: BUSINESS_NAME, "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    articleBody: args.content.join(" "),
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${args.slug}` },
  };
}

// ============================================================
// BreadcrumbList schema
// ============================================================
export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

// ============================================================
// Place schema for city/state location pages
// ============================================================
export function placeSchema(args: { city: string; state: string; stateAbbr: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${args.city}, ${args.stateAbbr}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: args.city,
      addressRegion: args.stateAbbr,
      addressCountry: "US",
    },
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: args.state,
    },
  };
}

// ============================================================
// JSON-LD script tag helper
// ============================================================
export function jsonLd(schema: object): string {
  // Escape `<` -> `<` so a `</script>` in any string value cannot break out
  // of the <script type="application/ld+json"> element (JSON-LD XSS vector).
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

// ============================================================
// Helper to inject multiple schemas as @graph
// ============================================================
export function graph(schemas: object[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": schemas,
  }).replace(/</g, "\\u003c");
}