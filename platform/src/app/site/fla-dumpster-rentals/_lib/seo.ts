import type { Service, Neighborhood } from "./data";

const SITE_NAME = "Florida Dumpster Rentals";
const SITE_URL = "https://www.fladumpsterrentals.com";
const PHONE = "954-710-2332";
const EMAIL = "hello@fladumpsterrentals.com";
const ADDRESS = "500 E Broward Blvd, Fort Lauderdale, FL 33394";

export function getMoneyPageMeta(service: Service, neighborhood: Neighborhood) {
  const location =
    neighborhood.name === neighborhood.region
      ? neighborhood.name
      : `${neighborhood.name}, ${neighborhood.region}`;
  const title = `${service.name} in ${neighborhood.name} | Call ${PHONE}`;
  const description = `${service.name} in ${location}. 10, 20 & 30 yard dumpsters with same-day delivery. Flat-rate pricing, no hidden fees. Call ${PHONE} or text for a free quote today.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}/${neighborhood.slug}`,
  };
}

export function getServiceHubMeta(service: Service) {
  const title = `${service.name} Across Florida | ${PHONE} | ${SITE_NAME}`;
  const description = `${service.name} across all of Florida. 10, 20 & 30 yard roll-off dumpsters with fast delivery and pickup. Serving every city and county in FL. Call ${PHONE} for a free quote.`;

  return {
    title,
    description,
    canonical: `${SITE_URL}/${service.slug}`,
  };
}

export function getNeighborhoodHubMeta(neighborhood: Neighborhood) {
  const title = `Dumpster Rental in ${neighborhood.name}, FL | Call ${PHONE}`;
  const description = `Affordable dumpster rental in ${neighborhood.name}, Florida. 10, 20 & 30 yard roll-off containers for construction, junk removal, cleanouts & more. Same-day delivery. Call ${PHONE}.`;

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
  const location =
    neighborhood.name === neighborhood.region
      ? neighborhood.name
      : `${neighborhood.name}, ${neighborhood.region}`;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE_NAME} — ${service.name}`,
    description: `${service.name} in ${location}. 10, 20 & 30 yard dumpsters with fast delivery.`,
    url: `${SITE_URL}/${service.slug}/${neighborhood.slug}`,
    telephone: PHONE,
    email: EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: "500 E Broward Blvd",
      addressLocality: "Fort Lauderdale",
      addressRegion: "FL",
      postalCode: "33394",
      addressCountry: "US",
    },
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
    priceRange: service.priceRange,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(service.avgRating),
      reviewCount: String(service.reviewCount),
      bestRating: "5",
    },
  };
}

export function getServiceSchema(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    url: `${SITE_URL}/${service.slug}`,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      telephone: PHONE,
    },
    areaServed: {
      "@type": "State",
      name: "Florida",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${service.name} Options`,
      itemListElement: service.commonServices.map((cs) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: cs,
        },
      })),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(service.avgRating),
      reviewCount: String(service.reviewCount),
      bestRating: "5",
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
    email: EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: "500 E Broward Blvd",
      addressLocality: "Fort Lauderdale",
      addressRegion: "FL",
      postalCode: "33394",
      addressCountry: "US",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "1247",
      bestRating: "5",
    },
  };
}

export function getHomePageSchema() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: SITE_URL,
      telephone: PHONE,
      email: EMAIL,
      address: {
        "@type": "PostalAddress",
        streetAddress: "500 E Broward Blvd",
        addressLocality: "Fort Lauderdale",
        addressRegion: "FL",
        postalCode: "33394",
        addressCountry: "US",
      },
      areaServed: {
        "@type": "State",
        name: "Florida",
      },
      priceRange: "$275 - $750",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "1247",
        bestRating: "5",
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "07:00",
        closes: "19:00",
      },
    },
    getWebsiteSchema(),
    getOrganizationSchema(),
  ];
}

export function getEducationPageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    name: "The Complete Guide to Dumpster Rental in Florida",
    headline: "The Complete Guide to Dumpster Rental in Florida",
    description:
      "Everything you need to know about renting a dumpster in Florida. Sizes, pricing, permits, regulations, and expert tips for every project type.",
    url: `${SITE_URL}/guide`,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

export function getBlogPostSchema(post: { title: string; slug: string; intro: string; publishedDate: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.intro.slice(0, 155),
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.publishedDate,
    dateModified: post.publishedDate,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
  };
}

export { SITE_NAME, SITE_URL, PHONE, EMAIL, ADDRESS };
