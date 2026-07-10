import { neighborhoods, boroughNames, allServices, allEvents, allClasses } from "./constants";
import type { Service, EventItem, ClassItem } from "./constants";

const SITE_URL = "https://thenycmobilesalon.com";
const BUSINESS_NAME = "The NYC Mobile Salon";

// ─── Param generators ───────────────────────────────────────────────

export function getAllNeighborhoodParams() {
  const params: { borough: string; neighborhood: string }[] = [];
  for (const [borough, hoods] of Object.entries(neighborhoods)) {
    for (const hood of hoods) {
      params.push({ borough, neighborhood: hood.slug });
    }
  }
  return params;
}

export function getAllBoroughParams() {
  return Object.keys(neighborhoods).map((borough) => ({ borough }));
}

/** Every combination: service × borough × neighborhood */
export function getServiceNeighborhoodParams() {
  const params: { slug: string; borough: string; neighborhood: string }[] = [];
  for (const svc of allServices) {
    for (const [borough, hoods] of Object.entries(neighborhoods)) {
      for (const hood of hoods) {
        params.push({ slug: svc.slug, borough, neighborhood: hood.slug });
      }
    }
  }
  return params;
}

/** Every combination: service × borough */
export function getServiceBoroughParams() {
  const params: { slug: string; borough: string }[] = [];
  for (const svc of allServices) {
    for (const borough of Object.keys(neighborhoods)) {
      params.push({ slug: svc.slug, borough });
    }
  }
  return params;
}

/** Every combination: event × borough × neighborhood */
export function getEventNeighborhoodParams() {
  const params: { slug: string; borough: string; neighborhood: string }[] = [];
  for (const evt of allEvents) {
    for (const [borough, hoods] of Object.entries(neighborhoods)) {
      for (const hood of hoods) {
        params.push({ slug: evt.slug, borough, neighborhood: hood.slug });
      }
    }
  }
  return params;
}

export function getEventBoroughParams() {
  const params: { slug: string; borough: string }[] = [];
  for (const evt of allEvents) {
    for (const borough of Object.keys(neighborhoods)) {
      params.push({ slug: evt.slug, borough });
    }
  }
  return params;
}

/** Every combination: class × borough × neighborhood */
export function getClassNeighborhoodParams() {
  const params: { slug: string; borough: string; neighborhood: string }[] = [];
  for (const cls of allClasses) {
    for (const [borough, hoods] of Object.entries(neighborhoods)) {
      for (const hood of hoods) {
        params.push({ slug: cls.slug, borough, neighborhood: hood.slug });
      }
    }
  }
  return params;
}

export function getClassBoroughParams() {
  const params: { slug: string; borough: string }[] = [];
  for (const cls of allClasses) {
    for (const borough of Object.keys(neighborhoods)) {
      params.push({ slug: cls.slug, borough });
    }
  }
  return params;
}

// ─── Lookups ────────────────────────────────────────────────────────

export function getNeighborhoodName(borough: string, neighborhoodSlug: string): string | null {
  const hoods = neighborhoods[borough];
  if (!hoods) return null;
  return hoods.find((h) => h.slug === neighborhoodSlug)?.name ?? null;
}

export function getBoroughName(boroughSlug: string): string | null {
  return boroughNames[boroughSlug] ?? null;
}

export function getServiceBySlug(slug: string): Service | null {
  return allServices.find((s) => s.slug === slug) ?? null;
}

export function getEventBySlug(slug: string): EventItem | null {
  return allEvents.find((e) => e.slug === slug) ?? null;
}

export function getClassBySlug(slug: string): ClassItem | null {
  return allClasses.find((c) => c.slug === slug) ?? null;
}

// ─── JSON-LD Schemas ────────────────────────────────────────────────

export function localBusinessSchema(overrides?: { name?: string; url?: string; description?: string; areaServed?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: overrides?.name ?? BUSINESS_NAME,
    url: overrides?.url ?? SITE_URL,
    description: overrides?.description ?? "Licensed mobile beauty professionals serving all 5 NYC boroughs. Hair, nails, makeup, grooming, and more — delivered to your door.",
    email: "hey@thenycmobilesalon.com",
    areaServed: overrides?.areaServed ?? "New York City",
    telephone: "+12122029075",
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    priceRange: "$99 - $500+",
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.759,
      longitude: -73.9845,
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
        "Sunday",
      ],
      opens: "08:00",
      closes: "21:00",
    },
    sameAs: ["https://instagram.com/thenycmobilesalon"],
    // aggregateRating values mirror stats[] in constants.ts ("4.9" Average Rating, "5k" Happy New Yorkers)
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "5000",
      bestRating: "5",
    },
  };
}

export function serviceSchema(serviceName: string, description: string, areaServed?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceName,
    description,
    provider: {
      "@type": "LocalBusiness",
      name: BUSINESS_NAME,
      url: SITE_URL,
    },
    areaServed: areaServed ?? "New York City",
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${SITE_URL}/book`,
      serviceType: "Mobile Service",
    },
    offers: {
      "@type": "Offer",
      price: "99",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "99",
        priceCurrency: "USD",
        unitText: "HOUR",
      },
      availability: "https://schema.org/InStock",
    },
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
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

export function breadcrumbSchema(items: { name: string; url: string }[]) {
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

export function eventSchema(params: { name: string; description: string; url: string; areaServed?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: params.name,
    description: params.description,
    url: params.url,
    location: {
      "@type": "Place",
      name: BUSINESS_NAME,
      address: {
        "@type": "PostalAddress",
        streetAddress: "150 W 47th St",
        addressLocality: "New York",
        addressRegion: "NY",
        postalCode: "10036",
        addressCountry: "US",
      },
    },
    organizer: {
      "@type": "Organization",
      name: BUSINESS_NAME,
      url: SITE_URL,
    },
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    offers: {
      "@type": "Offer",
      price: "99",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "99",
        priceCurrency: "USD",
        unitText: "HOUR",
      },
      availability: "https://schema.org/InStock",
    },
  };
}

export function courseSchema(params: { name: string; description: string; url: string; duration: string; groupSize: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: params.name,
    description: params.description,
    url: params.url,
    provider: {
      "@type": "LocalBusiness",
      name: BUSINESS_NAME,
      url: SITE_URL,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Onsite",
      duration: params.duration,
    },
  };
}

export { SITE_URL, BUSINESS_NAME };
