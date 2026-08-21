import type { Service, Neighborhood } from "./data";

const SITE_NAME = "NYC Commercial Exterminator";
const SITE_URL = "https://www.nyccommercialexterminator.com";
const PHONE = "212-202-8545";
const EMAIL = "hello@nyccommercialexterminator.com";
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
  const title = `Commercial ${service.name} in ${neighborhood.name} | NYC Commercial Pest Control & Exterminator | $249/hr`;
  const description = `Commercial ${service.name.toLowerCase()} in ${location} — $249/hr (fully inclusive). NYC's commercial-only pest control & exterminator service for restaurants, offices, retail, warehouses, hotels, healthcare & property management. DOH-compliant treatment, documentation, all labor + products in the rate. No contracts. No deposits. Licensed & insured. Text 212-202-8545.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}/${neighborhood.slug}`,
  };
}

export function getServiceHubMeta(service: Service) {
  const title = `Commercial ${service.name} NYC | Commercial Pest Control & Exterminator | $249/hr`;
  const description = `Commercial ${service.name.toLowerCase()} across NYC, NJ, Long Island & Westchester — $249/hr (fully inclusive). NYC's commercial-only pest control & exterminator. Restaurants, offices, retail, warehouses, hotels, healthcare & property management. DOH-compliant. No contracts. No deposits. Licensed & insured. Text 212-202-8545.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}`,
  };
}

export function getNeighborhoodHubMeta(neighborhood: Neighborhood) {
  const title = `Commercial Pest Control in ${neighborhood.name} | Commercial Exterminator | $249/hr`;
  const description = `Commercial pest control & exterminator services in ${neighborhood.name}, ${neighborhood.region} — $249/hr (fully inclusive). Restaurants, offices, retail, warehouses, hotels, healthcare & property management. DOH-compliant treatment. 30+ services. No contracts. No deposits. Text 212-202-8545.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/areas/${neighborhood.slug}`,
  };
}

// Was "@type": "PestControlService" with its own name/telephone/provider —
// a full second local-business entity on every one of the ~10,800
// service/neighborhood pages, on top of the single site-wide
// PestControlService the layout already emits (getLocalBusinessSchemaGlobal,
// @id `${SITE_URL}#business`). That told Google there were thousands of
// distinct businesses instead of one business offering many services in
// many areas. Now a Service tied back to that one business via @id.
export function getLocalBusinessSchema(
  service: Service,
  neighborhood: Neighborhood
) {
  const location = neighborhood.name === neighborhood.region ? neighborhood.name : `${neighborhood.name}, ${neighborhood.region}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} in ${location}`,
    description: `Commercial ${service.name.toLowerCase()} for businesses in ${location}.`,
    url: `${SITE_URL}/${service.slug}/${neighborhood.slug}`,
    provider: { "@id": `${SITE_URL}#business` },
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
    name: `Commercial ${service.name} NYC`,
    description: service.description,
    url: `${SITE_URL}/${service.slug}`,
    provider: { "@id": `${SITE_URL}#business` },
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
    priceRange: "$249/hr flat — fully inclusive",
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

export const getOrganizationSchema = getLocalBusinessSchemaGlobal;

export { SITE_NAME, SITE_URL, PHONE, EMAIL, ADDRESS };
