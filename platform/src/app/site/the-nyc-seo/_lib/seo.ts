import type { Service, Neighborhood } from "./data";

const SITE_NAME = "The NYC SEO";
const SITE_URL = "https://www.thenycseo.com";
const PHONE = "212-202-9220";

export function getMoneyPageMeta(service: Service, neighborhood: Neighborhood) {
  const location = neighborhood.name === neighborhood.region
    ? neighborhood.name
    : `${neighborhood.name}, ${neighborhood.region}`;
  const title = `SEO for ${service.name} Businesses in ${neighborhood.name} | Local SEO`;
  const description = `Local SEO and AI search optimization for ${service.name.toLowerCase()} businesses in ${location}. Rank on Google Maps, organic search, and AI platforms. Get a free SEO audit today.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}/${neighborhood.slug}`,
  };
}

export function getServiceHubMeta(service: Service) {
  const title = `SEO for ${service.name}s NYC | Rank Your ${service.name} Business`;
  const description = `SEO and AI search optimization for ${service.name.toLowerCase()} businesses in NYC. Local SEO, Google Maps, content marketing, and programmatic pages across 318 neighborhoods.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}`,
  };
}

export function getNeighborhoodHubMeta(neighborhood: Neighborhood) {
  const title = `SEO for Businesses in ${neighborhood.name} | ${neighborhood.region} Local SEO`;
  const description = `Local SEO and AI search optimization for businesses in ${neighborhood.name}, ${neighborhood.region}. We build optimized pages for all 172 service types. Dominate Google Maps and AI search.`;

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
    "@type": "ProfessionalService",
    name: `${SITE_NAME} — SEO for ${service.name} Businesses`,
    description: `Local SEO and AI search optimization for ${service.name.toLowerCase()} businesses in ${location}.`,
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
    serviceType: `SEO for ${service.name} Businesses`,
  };
}

export function getServiceSchema(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} Services NYC`,
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
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    telephone: PHONE,
    sameAs: ["https://www.consortiumnyc.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };
}

export function serviceToIndustrySlug(service: Service): string {
  return `${service.slug}-business-seo`;
}

export function getIndustryHubMeta(service: Service) {
  const title = `SEO for ${service.name} Businesses | ${service.name} SEO NYC`;
  const description = `SEO and AI search optimization built for ${service.name.toLowerCase()} businesses. Local SEO, Google Maps, programmatic pages, and AI search visibility across 318 NYC metro neighborhoods.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/industries/${serviceToIndustrySlug(service)}`,
  };
}

export function getIndustryRegionMeta(service: Service, region: string) {
  const title = `SEO for ${service.name} Businesses in ${region} | Local SEO`;
  const description = `Local SEO and AI search optimization for ${service.name.toLowerCase()} businesses in ${region}. Google Maps ranking, programmatic location pages, and AI search visibility for every neighborhood.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/industries/${serviceToIndustrySlug(service)}/${region.toLowerCase().replace(/\s+/g, "-")}`,
  };
}

export { SITE_NAME, SITE_URL, PHONE };
