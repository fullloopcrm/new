// Comprehensive JSON-LD Schema Generator for every page type

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.consortiumnyc.com/#organization",
  name: "The NYC Marketing Company",
  url: "https://www.consortiumnyc.com",
  logo: {
    "@type": "ImageObject",
    url: "https://www.consortiumnyc.com/logo.png",
    width: 600,
    height: 60,
  },
  image: "https://www.consortiumnyc.com/og-image.jpg",
  description:
    "The NYC Marketing Company is a full-service NYC marketing company specializing in SEO, branding, web design, business development, and automation for businesses across NYC, Long Island, and Westchester.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "New York",
    addressLocality: "New York",
    addressRegion: "NY",
    postalCode: "10001",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 40.7128,
    longitude: -74.006,
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-212-202-9220",
    contactType: "sales",
    areaServed: ["New York City", "Long Island", "Westchester County"],
    availableLanguage: "English",
  },
  sameAs: [
    "https://www.facebook.com/consortiumnyc",
    "https://www.instagram.com/consortiumnyc",
    "https://www.linkedin.com/company/consortiumnyc",
    "https://twitter.com/consortiumnyc",
  ],
  foundingDate: "2020",
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    minValue: 2,
    maxValue: 10,
  },
  areaServed: [
    {
      "@type": "City",
      name: "New York",
      "@id": "https://en.wikipedia.org/wiki/New_York_City",
    },
    {
      "@type": "State",
      name: "New York",
    },
  ],
  knowsAbout: [
    "Search Engine Optimization",
    "Web Design",
    "Branding",
    "Digital Marketing Strategy",
    "Business Development",
    "Marketing Automation",
    "Local SEO",
    "Content Marketing",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.consortiumnyc.com/#website",
  url: "https://www.consortiumnyc.com",
  name: "The NYC Marketing Company",
  description: "NYC Marketing Company | SEO, Branding, Web Design & Automation",
  publisher: {
    "@id": "https://www.consortiumnyc.com/#organization",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.consortiumnyc.com/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export function localBusinessSchema(area: string, areaType: string = "City") {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in/${area.toLowerCase().replace(/\s+/g, "-")}/#localbusiness`,
    name: `The NYC Marketing Company - ${area} Digital Marketing`,
    image: "https://www.consortiumnyc.com/og-image.jpg",
    url: `https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in/${area.toLowerCase().replace(/\s+/g, "-")}`,
    telephone: "+1-212-202-9220",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: area,
      addressRegion: "NY",
      addressCountry: "US",
    },
    areaServed: {
      "@type": areaType,
      name: area,
    },
    parentOrganization: {
      "@id": "https://www.consortiumnyc.com/#organization",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Digital Marketing Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "SEO" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Web Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Branding" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Business Development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Marketing Automation" } },
      ],
    },
  };
}

export function serviceSchema(
  serviceName: string,
  serviceSlug: string,
  description: string,
  area?: string
) {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `https://www.consortiumnyc.com/services/${serviceSlug}/#service`,
    name: serviceName,
    description,
    url: area
      ? `https://www.consortiumnyc.com/services/${serviceSlug}/${area.toLowerCase().replace(/\s+/g, "-")}`
      : `https://www.consortiumnyc.com/services/${serviceSlug}`,
    provider: {
      "@id": "https://www.consortiumnyc.com/#organization",
    },
    serviceType: serviceName,
    areaServed: area
      ? { "@type": "Place", name: area }
      : [
          { "@type": "City", name: "New York" },
          { "@type": "Place", name: "Long Island" },
          { "@type": "Place", name: "Westchester" },
        ],
  };

  return base;
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
    isPartOf: { "@id": "https://www.consortiumnyc.com/#website" },
    about: { "@id": "https://www.consortiumnyc.com/#organization" },
    datePublished: "2024-01-01",
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
    image: image || "https://www.consortiumnyc.com/og-image.jpg",
    datePublished,
    dateModified,
    author: {
      "@id": "https://www.consortiumnyc.com/#organization",
    },
    publisher: {
      "@id": "https://www.consortiumnyc.com/#organization",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "en-US",
  };
}

export function aggregateRatingSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "The NYC Marketing Company",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "47",
      bestRating: "5",
      worstRating: "1",
    },
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
