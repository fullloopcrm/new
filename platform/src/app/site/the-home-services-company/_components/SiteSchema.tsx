// @ts-nocheck
import { PHONE, EMAIL, CITY_COUNT, STATE_COUNT, HOURS, RATING, REVIEW_COUNT } from "@/app/site/the-home-services-company/_data/content";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";

const SITE_URL = "https://www.thehomeservicescompany.com";

export function SiteSchema() {
  const organization = {
    "@context": "https://schema.org",
    "@type": ["Organization", "HomeAndConstructionBusiness", "LocalBusiness"],
    name: "Home Services Co",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    image: `${SITE_URL}/icon.svg`,
    telephone: PHONE,
    email: EMAIL,
    priceRange: "$$",
    areaServed: { "@type": "Country", name: "United States" },
    description: `One phone number for 40 home services across ${CITY_COUNT} cities in all ${STATE_COUNT} states. Starting at $99/hour with upfront pricing, licensed and insured technicians, same-day availability.`,
    openingHours: HOURS,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: RATING,
      reviewCount: REVIEW_COUNT.replace("+", ""),
      bestRating: "5",
      worstRating: "1",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "40 Home Services",
      itemListElement: SERVICES.slice(0, 40).map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.title,
          url: `${SITE_URL}/services/${s.slug}`,
        },
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "99",
          priceCurrency: "USD",
          unitText: "HOUR",
        },
      })),
    },
    sameAs: [] as string[],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Home Services Co",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/locations?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  );
}

export function LocalBusinessSchema({
  name,
  cityName,
  stateAbbr,
  address,
  zip,
  telephone = PHONE,
}: {
  name?: string;
  cityName: string;
  stateAbbr: string;
  address?: string;
  zip?: string;
  telephone?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: name || `Home Services Co — ${cityName}, ${stateAbbr}`,
    url: SITE_URL,
    telephone,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: address || "",
      addressLocality: cityName,
      addressRegion: stateAbbr,
      postalCode: zip || "",
      addressCountry: "US",
    },
    areaServed: { "@type": "City", name: cityName },
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export function ServiceSchema({ serviceName, description }: { serviceName: string; description: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceName,
    description,
    provider: {
      "@type": "Organization",
      name: "Home Services Co",
      url: SITE_URL,
    },
    areaServed: { "@type": "Country", name: "United States" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "99",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "99",
        priceCurrency: "USD",
        unitText: "HOUR",
      },
    },
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export function FAQSchema({ items }: { items: { q: string; a: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}
