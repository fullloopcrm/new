import type { Service, Neighborhood } from "./data";

const SITE_NAME = "The DC Exterminator";
const SITE_URL = "https://www.thedcexterminator.com";
const PHONE = "(202) 918-1200";
const EMAIL = "hello@thedcexterminator.com";
// Service-area business — no public storefront/street address, so address data
// intentionally omits streetAddress (Google's supported pattern for SABs).
const ADDRESS = {
  city: "Washington",
  state: "DC",
  zip: "20001",
};

export function getMoneyPageMeta(service: Service, neighborhood: Neighborhood) {
  const location = neighborhood.name === neighborhood.region
    ? neighborhood.name
    : `${neighborhood.name}, ${neighborhood.region}`;
  const title = `${service.name} in ${neighborhood.name} | $199/hr | Self-Book & Save $20`;
  const description = `${service.name} in ${location} — at a flat $199/hr, 1-hour minimum (fully inclusive — no hidden fees). Self-book online & save $20 — the fastest way to get service. Pay only when the job is done. No contracts, no deposits, no catches. Licensed & insured. Inspection.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}/${neighborhood.slug}`,
  };
}

export function getServiceHubMeta(service: Service) {
  const title = `${service.name} DC | $199/hr | Self-Book & Save $20`;
  const description = `${service.name} across DC, Northern Virginia & Suburban Maryland — at a flat $199/hr, 1-hour minimum (fully inclusive — no hidden fees). Self-book online & save $20 — the fastest way to get service. Pay only when the job is done. No contracts. No deposits. No catches. Licensed & insured.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}`,
  };
}

export function getNeighborhoodHubMeta(neighborhood: Neighborhood) {
  const title = `Pest Control in ${neighborhood.name} | $199/hr | Self-Book & Save $20`;
  const description = `Pest control & exterminator services in ${neighborhood.name}, ${neighborhood.region} — at a flat $199/hr, 1-hour minimum (fully inclusive — no hidden fees). Self-book online & save $20 — the fastest way to get service. 30+ services. Pay only when the job is done. No contracts. No deposits. No catches. Inspection.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/areas/${neighborhood.slug}`,
  };
}

export function getLocalBusinessSchema(
  service: Service,
  neighborhood: Neighborhood
) {
  const location = neighborhood.name === neighborhood.region ? neighborhood.name : `${neighborhood.name}, ${neighborhood.region}`;
  return {
    "@context": "https://schema.org",
    "@type": "PestControlService",
    name: `${SITE_NAME} — ${service.name}`,
    description: `Professional ${service.name.toLowerCase()} in ${location}.`,
    url: `${SITE_URL}/${service.slug}/${neighborhood.slug}`,
    telephone: PHONE,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: {
      "@type": "Place",
      name: location,
    },
    serviceType: service.name,
  };
}

export function getServiceSchema(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} DC`,
    description: service.description,
    url: `${SITE_URL}/${service.slug}`,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: {
      "@type": "City",
      name: "Washington, D.C.",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${service.name} Services`,
      itemListElement: service.commonServices.map((cs) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: cs,
        },
      })),
    },
  };
}

export function getFAQPageSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function getBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

// Single canonical LocalBusiness schema. Used once per page (in layout.tsx).
// Combines what was previously split across getOrganizationSchema and
// getLocalBusinessSchemaGlobal — emitting both produced duplicate-type
// warnings in Google Search Console. Now there's one source of truth.
//
// Includes every Google-required field for LocalBusiness rich results:
// name, address, telephone, image, priceRange. Plus opening hours, geo,
// areaServed, parentOrganization, and sameAs for fuller knowledge graph
// coverage.
export function getLocalBusinessSchemaGlobal() {
  return {
    "@context": "https://schema.org",
    "@type": "PestControlService",
    "@id": `${SITE_URL}#business`,
    name: SITE_NAME,
    url: SITE_URL,
    telephone: PHONE,
    email: EMAIL,
    image: `${SITE_URL}/icon.svg`,
    priceRange: "$199/hr — fully inclusive, 1-hour minimum",
    address: {
      "@type": "PostalAddress",
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.state,
      postalCode: ADDRESS.zip,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 38.9072,
      longitude: -77.0369,
    },
    areaServed: [
      { "@type": "City", name: "Washington, D.C." },
      { "@type": "Place", name: "Northern Virginia" },
      { "@type": "Place", name: "Suburban Maryland" },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday"],
        opens: "08:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday"],
        opens: "09:00",
        closes: "17:00",
      },
    ],
    sameAs: ["https://www.consortiumnyc.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium DC",
      url: "https://www.consortiumnyc.com",
    },
  };
}

// Backwards-compat alias for callsites that still import the old name.
// Both names now return the SAME canonical object so even if a page
// accidentally emits both, JSON.stringify produces identical scripts
// — but the right fix (done in this pass) is to call neither at the
// page level since layout.tsx already emits this once for the whole site.
export const getOrganizationSchema = getLocalBusinessSchemaGlobal;

export { SITE_NAME, SITE_URL, PHONE, EMAIL, ADDRESS };
