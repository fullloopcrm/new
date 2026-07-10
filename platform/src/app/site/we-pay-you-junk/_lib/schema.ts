// Structured-data (JSON-LD) builders for We Pay You Junk Removal.
// Rendered via <JsonLd data={...} />.
import { PHONE, EMAIL } from "@/app/site/we-pay-you-junk/_data/content";

export const SITE_URL = "https://www.wepayyoujunkremoval.com";
const BRAND = "We Pay You Junk Removal";
const LOGO = `${SITE_URL}/logo.png`;
const TEL = "+1-888-831-3001";

// datePosted that refreshes weekly (anchored to the most recent Monday, UTC) so
// job postings never look stale to Google without changing on every request.
export function weeklyDatePosted(now: Date = new Date()): string {
  const d = new Date(now);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function organizationLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: SITE_URL,
    logo: LOGO,
    email: EMAIL,
    telephone: TEL,
    sameAs: [] as string[],
  };
}

// Service-area business (no single storefront — serves the whole US).
export function localBusinessLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: BRAND,
    url: SITE_URL,
    logo: LOGO,
    image: LOGO,
    telephone: TEL,
    email: EMAIL,
    priceRange: "$$",
    areaServed: { "@type": "Country", name: "United States" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "07:00",
        closes: "20:00",
      },
    ],
    slogan: "We come to you — we pay you for your stuff.",
    description:
      "Nationwide junk removal that pays you back — $200/hr fully inclusive, dump fees included, 50% resale credit on valuable items.",
  };
}

export function websiteLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND,
    url: SITE_URL,
  };
}

export function serviceLd(opts: {
  name: string;
  description: string;
  slug: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}/services/${opts.slug}`,
    provider: { "@type": "LocalBusiness", name: BRAND, url: SITE_URL, telephone: TEL },
    areaServed: { "@type": "Country", name: "United States" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "200",
        priceCurrency: "USD",
        unitText: "HUR",
      },
    },
  };
}

export function faqPageLd(faqs: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function jobPostingLd(opts: {
  title: string;
  description: string;
  url: string;
  city?: string;
  state?: string;
  now?: Date;
}): Record<string, unknown> {
  const datePosted = weeklyDatePosted(opts.now);
  const validThrough = addDays(datePosted, 33);
  const addressLocality = opts.city || undefined;
  const addressRegion = opts.state || undefined;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: opts.title,
    description: opts.description,
    url: opts.url,
    datePosted,
    validThrough,
    employmentType: "CONTRACTOR",
    directApply: true,
    hiringOrganization: { "@type": "Organization", name: BRAND, sameAs: SITE_URL, logo: LOGO },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: "USA" },
    jobLocation: addressLocality || addressRegion
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality,
            addressRegion,
            addressCountry: "US",
          },
        }
      : undefined,
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: { "@type": "QuantitativeValue", value: 100, unitText: "HOUR" },
    },
    telephone: TEL,
  };
}

export function blogPostingLd(opts: {
  title: string;
  description: string;
  slug: string;
  datePublished?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: opts.title,
    description: opts.description,
    url: `${SITE_URL}/blog/${opts.slug}`,
    mainEntityOfPage: `${SITE_URL}/blog/${opts.slug}`,
    author: { "@type": "Organization", name: BRAND },
    publisher: { "@type": "Organization", name: BRAND, logo: { "@type": "ImageObject", url: LOGO } },
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
  };
}

export { PHONE };
