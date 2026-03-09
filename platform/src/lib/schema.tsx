// Comprehensive JSON-LD Schema Generator for every page type

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://fullloopcrm.com/#organization",
  name: "Full Loop CRM",
  url: "https://fullloopcrm.com",
  logo: {
    "@type": "ImageObject",
    url: "https://fullloopcrm.com/logo.png",
    width: 600,
    height: 60,
  },
  image: "https://fullloopcrm.com/opengraph-image",
  description:
    "Full Loop CRM is the first full-cycle CRM for home service businesses — AI-powered lead generation, sales automation, scheduling, GPS field operations, payments, reviews, and retargeting in one platform.",
  email: "hello@fullloopcrm.com",
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
    latitude: 40.7601,
    longitude: -73.9847,
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+1-212-202-9220",
      contactType: "sales",
      areaServed: "US",
      availableLanguage: ["English", "Spanish"],
    },
    {
      "@type": "ContactPoint",
      telephone: "+1-212-202-9220",
      contactType: "customer support",
      areaServed: "US",
      availableLanguage: ["English", "Spanish"],
    },
  ],
  foundingDate: "2025",
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    minValue: 1,
    maxValue: 10,
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  knowsAbout: [
    "Home Service CRM",
    "Field Service Management",
    "AI Sales Automation",
    "Organic Lead Generation",
    "Multi-Domain SEO",
    "Service Business Scheduling",
    "GPS Field Operations",
    "Review Management",
    "Customer Retargeting",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://fullloopcrm.com/#website",
  url: "https://fullloopcrm.com",
  name: "Full Loop CRM",
  description:
    "The first full-cycle CRM for home service businesses. AI-powered lead generation, sales automation, scheduling, GPS field operations, payments, reviews, and retargeting in one platform.",
  publisher: {
    "@id": "https://fullloopcrm.com/#organization",
  },
  inLanguage: "en-US",
};

export function localBusinessSchema(area: string, areaType: string = "City") {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://fullloopcrm.com/${area.toLowerCase().replace(/\s+/g, "-")}/#software`,
    name: `Full Loop CRM - ${area}`,
    image: "https://fullloopcrm.com/opengraph-image",
    url: `https://fullloopcrm.com/${area.toLowerCase().replace(/\s+/g, "-")}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "2500",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "2500",
        priceCurrency: "USD",
        unitText: "MONTH",
      },
    },
    areaServed: {
      "@type": areaType,
      name: area,
    },
    provider: {
      "@id": "https://fullloopcrm.com/#organization",
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
    "@id": `https://fullloopcrm.com/${serviceSlug}/#service`,
    name: serviceName,
    description,
    url: area
      ? `https://fullloopcrm.com/${serviceSlug}/${area.toLowerCase().replace(/\s+/g, "-")}`
      : `https://fullloopcrm.com/${serviceSlug}`,
    provider: {
      "@id": "https://fullloopcrm.com/#organization",
    },
    serviceType: serviceName,
    areaServed: area
      ? { "@type": "Place", name: area }
      : { "@type": "Country", name: "United States" },
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
    isPartOf: { "@id": "https://fullloopcrm.com/#website" },
    about: { "@id": "https://fullloopcrm.com/#organization" },
    datePublished: "2025-01-01",
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
    image: image || "https://fullloopcrm.com/opengraph-image",
    datePublished,
    dateModified,
    author: {
      "@id": "https://fullloopcrm.com/#organization",
    },
    publisher: {
      "@id": "https://fullloopcrm.com/#organization",
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
    "@type": "SoftwareApplication",
    name: "Full Loop CRM",
    applicationCategory: "BusinessApplication",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "47",
      bestRating: "5",
      worstRating: "1",
    },
  };
}

export function softwareApplicationSchema(
  price: string = "2500",
  priceCurrency: string = "USD"
) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://fullloopcrm.com/#software",
    name: "Full Loop CRM",
    description:
      "The first full-cycle CRM for home service businesses — AI-powered lead generation, sales automation, scheduling, GPS field operations, payments, reviews, and retargeting in one platform.",
    url: "https://fullloopcrm.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    image: "https://fullloopcrm.com/opengraph-image",
    offers: {
      "@type": "Offer",
      price,
      priceCurrency,
      priceValidUntil: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .split("T")[0],
      availability: "https://schema.org/InStock",
      url: "https://fullloopcrm.com/full-loop-crm-pricing",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price,
        priceCurrency,
        unitText: "MONTH",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: "1",
          unitCode: "MON",
        },
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "47",
      bestRating: "5",
      worstRating: "1",
    },
    provider: {
      "@id": "https://fullloopcrm.com/#organization",
    },
    featureList: [
      "AI-Powered Lead Generation",
      "Automated Sales via SMS & Phone",
      "Scheduling & Dispatch",
      "GPS Field Operations Tracking",
      "Stripe Payment Processing",
      "Automated Review Requests",
      "Customer Retargeting & Rebooking",
      "Bilingual Team Portal (EN/ES)",
      "Client Self-Service Portal",
      "Multi-Domain SEO Network",
    ],
  };
}

export function itemListSchema(
  name: string,
  items: { name: string; url: string; description?: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
      ...(item.description ? { description: item.description } : {}),
    })),
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
    totalTime: "PT30M",
    image: "https://fullloopcrm.com/opengraph-image",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
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
