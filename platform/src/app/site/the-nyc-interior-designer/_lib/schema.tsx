const DOMAIN = "https://www.thenycinteriordesigner.com";
const BIZ_NAME = "The NYC Interior Designer";
const PHONE = "+1-917-473-2013";

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
    "The NYC Interior Designer provides expert interior design services including full-home design, kitchen and bathroom renovation, commercial interiors, staging, and smart home integration across Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, Westchester, and New Jersey.",
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
    { "@type": "AdministrativeArea", name: "New Jersey" },
  ],
  knowsAbout: [
    "Interior Design",
    "Kitchen Design",
    "Bathroom Design",
    "Living Room Design",
    "Bedroom Design",
    "Home Office Design",
    "Commercial Interior Design",
    "Space Planning",
    "Color Consultation",
    "Furniture Selection",
    "Lighting Design",
    "Custom Closet Design",
    "Renovation Management",
    "Window Treatment Design",
    "Art Curation & Styling",
    "Staging & Styling",
    "Wallpaper & Wall Treatments",
    "Smart Home Integration",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${DOMAIN}/#website`,
  url: DOMAIN,
  name: BIZ_NAME,
  description:
    "NYC Interior Design Services | Residential & Commercial Design for All Five Boroughs, Long Island, Westchester & New Jersey",
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
    description: `Professional ${serviceName.toLowerCase()} services in New York City. Serving Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, Westchester, and New Jersey.`,
    url: `${DOMAIN}/services/${serviceSlug}`,
    provider: { "@id": `${DOMAIN}/#organization` },
    areaServed: {
      "@type": "City",
      name: "New York",
    },
    serviceType: "InteriorDesign",
  };
}

export function boroughPageSchema(borough: string) {
  const slug = borough.toLowerCase().replace(/\s+/g, "-");
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${DOMAIN}/areas/${slug}/#webpage`,
    name: `Interior Design Services in ${borough}`,
    description: `Professional interior design, renovation management, and styling services in ${borough}. Free consultations from The NYC Interior Designer.`,
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
    datePublished: "2026-04-02",
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
      ? `Professional interior design services in ${boroughName}. Full-home design, kitchen and bathroom renovation, commercial interiors, staging, and smart home integration.`
      : "Full-service interior design firm serving New York City, Long Island, Westchester, and New Jersey. Residential and commercial design, renovation management, and styling.",
    url: DOMAIN,
    telephone: PHONE,
    email: "hello@thenycinteriordesigner.com",
    image: `${DOMAIN}/og-image.jpg`,
    priceRange: "$$-$$$$",
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
      { "@type": "AdministrativeArea", name: "New Jersey" },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "16:00",
      },
    ],
    sameAs: [DOMAIN],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Interior Design Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Full-Home Interior Design",
            description:
              "Complete interior design services for apartments, brownstones, townhouses, and condos across New York City.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Kitchen & Bathroom Design",
            description:
              "Custom kitchen and bathroom design and renovation for NYC properties, including co-op board coordination and permit management.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Staging & Renovation Management",
            description:
              "Real estate staging, renovation project management, and contractor coordination for NYC apartments and homes.",
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
