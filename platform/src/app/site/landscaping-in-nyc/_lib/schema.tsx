const DOMAIN = "https://www.landscapinginnyc.com";
const BIZ_NAME = "Landscaping In NYC";
const PHONE = "+1-212-470-9637";

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${DOMAIN}/#organization`,
  name: BIZ_NAME,
  url: DOMAIN,
  logo: {
    "@type": "ImageObject",
    url: `${DOMAIN}/logo.png`,
    width: 600,
    height: 60,
  },
  image: `${DOMAIN}/og-image.jpg`,
  description:
    "Landscaping In NYC provides expert landscape design, rooftop gardens, hardscaping, seasonal maintenance, and snow removal services across Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, and Westchester.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "150 W 47th St",
    addressLocality: "New York",
    addressRegion: "NY",
    postalCode: "10036",
    addressCountry: "US",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: PHONE,
    contactType: "customer service",
    areaServed: "US",
    availableLanguage: "English",
  },
  areaServed: [
    { "@type": "City", name: "New York" },
    { "@type": "Borough", name: "Manhattan" },
    { "@type": "Borough", name: "Brooklyn" },
    { "@type": "Borough", name: "Queens" },
    { "@type": "Borough", name: "Bronx" },
    { "@type": "Borough", name: "Staten Island" },
    { "@type": "AdministrativeArea", name: "Long Island" },
    { "@type": "AdministrativeArea", name: "Westchester County" },
  ],
  knowsAbout: [
    "Landscape Design",
    "Rooftop Gardens",
    "Irrigation Systems",
    "Landscape Lighting",
    "Lawn & Garden Maintenance",
    "Snow Removal",
    "Patio & Hardscape Design",
    "Tree & Shrub Care",
    "Commercial Landscaping",
    "Residential Landscaping",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${DOMAIN}/#website`,
  url: DOMAIN,
  name: BIZ_NAME,
  description:
    "NYC Landscaping Services | Design, Installation & Maintenance for All Five Boroughs, Long Island & Westchester",
  publisher: {
    "@id": `${DOMAIN}/#organization`,
  },
};

export function servicePageSchema(serviceSlug: string, serviceName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${DOMAIN}/services/${serviceSlug}/#service`,
    name: `${serviceName} in NYC`,
    description: `Professional ${serviceName.toLowerCase()} services in New York City. Serving Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, and Westchester.`,
    url: `${DOMAIN}/services/${serviceSlug}`,
    provider: { "@id": `${DOMAIN}/#organization` },
    areaServed: {
      "@type": "City",
      name: "New York",
    },
    serviceType: serviceName,
  };
}

export function boroughPageSchema(borough: string) {
  const slug = borough.toLowerCase().replace(/\s+/g, "-");
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${DOMAIN}/areas/${slug}/#webpage`,
    name: `Landscaping Services in ${borough}`,
    description: `Professional landscaping, garden design, and outdoor maintenance services in ${borough}. Free estimates from Landscaping In NYC.`,
    url: `${DOMAIN}/areas/${slug}`,
    isPartOf: { "@id": `${DOMAIN}/#website` },
    about: { "@id": `${DOMAIN}/#organization` },
    inLanguage: "en-US",
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
    isPartOf: { "@id": `${DOMAIN}/#website` },
    about: { "@id": `${DOMAIN}/#organization` },
    datePublished: "2026-03-26",
    dateModified: new Date().toISOString().split("T")[0],
    inLanguage: "en-US",
  };

  if (breadcrumbs) {
    schema.breadcrumb = breadcrumbSchema(breadcrumbs);
  }

  return schema;
}

export function articleSchema(
  title: string,
  description: string,
  url: string,
  datePublished: string,
  dateModified: string,
  image?: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: image || `${DOMAIN}/og-image.jpg`,
    datePublished,
    dateModified,
    author: {
      "@id": `${DOMAIN}/#organization`,
    },
    publisher: {
      "@id": `${DOMAIN}/#organization`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "en-US",
  };
}

export function localBusinessSchema(boroughName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${DOMAIN}/#localbusiness`,
    name: BIZ_NAME,
    description: boroughName
      ? `Professional landscaping services in ${boroughName}. Landscape design, rooftop gardens, hardscaping, seasonal maintenance, and snow removal.`
      : "Full-service landscaping company serving New York City, Long Island, and Westchester. Design, installation, and year-round maintenance.",
    url: DOMAIN,
    telephone: PHONE,
    email: "green@landscapinginnyc.com",
    image: `${DOMAIN}/og-image.jpg`,
    priceRange: "$$-$$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.7591,
      longitude: -73.9851,
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "AdministrativeArea", name: "Long Island" },
      { "@type": "AdministrativeArea", name: "Westchester County" },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "08:00",
        closes: "16:00",
      },
    ],
    sameAs: [DOMAIN],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Landscaping Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Landscape Design & Installation",
            description:
              "Custom landscape design, planting plans, and full installation for residential and commercial properties in NYC.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Rooftop Gardens & Terraces",
            description:
              "Design, waterproofing coordination, soil engineering, and planting for rooftop and terrace gardens throughout Manhattan and Brooklyn.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Seasonal Maintenance & Snow Removal",
            description:
              "Year-round lawn care, seasonal flower rotations, leaf cleanup, and commercial snow removal for NYC properties.",
          },
        },
      ],
    },
  };
}

export function howToSchema(
  name: string,
  description: string,
  steps: { name: string; text: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
