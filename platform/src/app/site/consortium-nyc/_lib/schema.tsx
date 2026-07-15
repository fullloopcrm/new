// Comprehensive JSON-LD Schema Generator for every page type

import { safeJsonLd } from '@/lib/escape-html'
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.consortiumnyc.com/#organization",
  name: "Consortium NYC",
  url: "https://www.consortiumnyc.com",
  logo: {
    "@type": "ImageObject",
    url: "https://www.consortiumnyc.com/logo.png",
    width: 600,
    height: 60,
  },
  image: "https://www.consortiumnyc.com/og-consortium.jpg",
  description:
    "Consortium NYC is a New York City web design and website design company specializing in custom, high-performance, SEO-ready websites for businesses across NYC, Long Island, and Westchester. Now partnered with The NYC Marketing Co.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "150 West 47th Street",
    addressLocality: "New York",
    addressRegion: "NY",
    postalCode: "10036",
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
    "Web Design",
    "Website Design",
    "Custom Web Development",
    "Responsive Web Design",
    "Website Redesign",
    "Search Engine Optimization",
    "Local SEO",
    "Conversion Rate Optimization",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.consortiumnyc.com/#website",
  url: "https://www.consortiumnyc.com",
  name: "Consortium NYC",
  description: "NYC Web Design & Website Design Company | Custom, SEO-ready websites for NYC businesses",
  publisher: {
    "@id": "https://www.consortiumnyc.com/#organization",
  },
};

export function localBusinessSchema(area: string, areaType: string = "City") {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in/${area.toLowerCase().replace(/\s+/g, "-")}/#localbusiness`,
    name: `Consortium NYC - ${area} Web Design`,
    image: "https://www.consortiumnyc.com/og-consortium.jpg",
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
      name: "Web Design Services",
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
    image: image || "https://www.consortiumnyc.com/og-consortium.jpg",
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

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data).replace(/</g, "\\u003c") }}
    />
  );
}
