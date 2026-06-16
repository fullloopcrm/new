// @ts-nocheck
import type { Service, Neighborhood } from "./data";

const SITE_NAME = "The NYC Exterminator";
const SITE_URL = "https://www.thenycexterminator.com";
const PHONE = "212-202-8545";
const EMAIL = "hello@thenycexterminator.com";
const ADDRESS = {
  street: "150 W 47th St",
  city: "New York",
  state: "NY",
  zip: "10036",
};

export function getMoneyPageMeta(service: Service, neighborhood: Neighborhood) {
  const location = neighborhood.name === neighborhood.region
    ? neighborhood.name
    : `${neighborhood.name}, ${neighborhood.region}`;
  const title = `${service.name} in ${neighborhood.name} | Starting at $49 | Fully Inclusive NYC Pest Control`;
  const description = `${service.name} in ${location} — starting at $49 (fully inclusive — no hidden fees). Labor, products, treatment, follow-up — all in the price. Pay only when the job is done. No contracts, no deposits, no catches. Licensed & insured. Free inspection. Text 212-202-8545.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}/${neighborhood.slug}`,
  };
}

export function getServiceHubMeta(service: Service) {
  const title = `${service.name} NYC | Starting at $49 | Fully Inclusive NYC Pest Control`;
  const description = `${service.name} across NYC, NJ, Long Island & Westchester — starting at $49 (fully inclusive — no hidden fees). Pay only when the job is done. No contracts. No deposits. No catches. Labor, products, treatment, follow-up — all in the price. Licensed & insured. Text 212-202-8545.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}`,
  };
}

export function getNeighborhoodHubMeta(neighborhood: Neighborhood) {
  const title = `Pest Control in ${neighborhood.name} | Starting at $49 | Fully Inclusive`;
  const description = `Pest control & exterminator services in ${neighborhood.name}, ${neighborhood.region} — starting at $49 (fully inclusive — no hidden fees). 30+ services. Pay only when the job is done. No contracts. No deposits. No catches. Free inspection. Text 212-202-8545.`;

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
    name: `${service.name} NYC`,
    description: service.description,
    url: `${SITE_URL}/${service.slug}`,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: {
      "@type": "City",
      name: "New York",
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
    priceRange: "Starting at $49 — fully inclusive",
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.state,
      postalCode: ADDRESS.zip,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.758,
      longitude: -73.9855,
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "Place", name: "Long Island" },
      { "@type": "Place", name: "Westchester" },
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
      name: "Consortium NYC",
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
