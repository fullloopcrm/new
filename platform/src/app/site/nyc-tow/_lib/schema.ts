/**
 * JSON-LD schema builders for The NYC Towing Service.
 *
 * All builders return plain serializable objects. Use with the <JsonLd/>
 * component (below) to emit them as <script type="application/ld+json"> tags.
 */
import type { ReactElement } from "react";
import { createElement, Fragment } from "react";

import { PHONE, EMAIL, RATING, REVIEW_COUNT, FAQ } from "@/app/site/nyc-tow/_data/content";
import { PRICING } from "@/app/site/nyc-tow/_data/content";
import { OFFICES, type Office } from "@/app/site/nyc-tow/_data/offices";
import { SERVICES, SERVICE_CATEGORIES, type Service } from "@/app/site/nyc-tow/_data/services";

export const SITE_URL = "https://www.thenyctowingservice.com";
export const BRAND_NAME = "The NYC Towing Service";
export const LOGO_URL = `${SITE_URL}/icon`;

/** Turn a relative or absolute href into an absolute URL on our domain. */
export function absUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Approximate lat/lon per borough for LocalBusiness `geo` blocks. */
const BOROUGH_GEO: Record<string, { lat: number; lon: number }> = {
  manhattan: { lat: 40.7831, lon: -73.9712 },
  brooklyn: { lat: 40.6782, lon: -73.9442 },
  queens: { lat: 40.7282, lon: -73.7949 },
  bronx: { lat: 40.8448, lon: -73.8648 },
  "staten-island": { lat: 40.5795, lon: -74.1502 },
};

/** Neighborhood-level geo overrides for a handful of high-volume areas. Falls back to borough geo. */
const NEIGHBORHOOD_GEO: Record<string, { lat: number; lon: number }> = {
  "financial-district": { lat: 40.7074, lon: -74.0113 },
  "battery-park-city": { lat: 40.7115, lon: -74.0160 },
  tribeca: { lat: 40.7163, lon: -74.0086 },
  soho: { lat: 40.7233, lon: -74.0020 },
  "east-village": { lat: 40.7265, lon: -73.9815 },
  "west-village": { lat: 40.7358, lon: -74.0036 },
  chelsea: { lat: 40.7465, lon: -74.0014 },
  midtown: { lat: 40.7549, lon: -73.9840 },
  "midtown-east": { lat: 40.7579, lon: -73.9716 },
  "midtown-west": { lat: 40.7617, lon: -73.9847 },
  "hudson-yards": { lat: 40.7540, lon: -74.0020 },
  "upper-east-side": { lat: 40.7736, lon: -73.9566 },
  "upper-west-side": { lat: 40.7870, lon: -73.9754 },
  harlem: { lat: 40.8116, lon: -73.9465 },
  yorkville: { lat: 40.7753, lon: -73.9480 },
  williamsburg: { lat: 40.7081, lon: -73.9571 },
  greenpoint: { lat: 40.7292, lon: -73.9537 },
  bushwick: { lat: 40.6944, lon: -73.9213 },
  "park-slope": { lat: 40.6728, lon: -73.9799 },
  "brooklyn-heights": { lat: 40.6957, lon: -73.9936 },
  dumbo: { lat: 40.7033, lon: -73.9881 },
  "bay-ridge": { lat: 40.6263, lon: -74.0299 },
  "red-hook": { lat: 40.6743, lon: -74.0084 },
  gowanus: { lat: 40.6731, lon: -73.9869 },
  "bed-stuy": { lat: 40.6872, lon: -73.9418 },
  "crown-heights": { lat: 40.6690, lon: -73.9442 },
  "long-island-city": { lat: 40.7447, lon: -73.9485 },
  astoria: { lat: 40.7644, lon: -73.9235 },
  flushing: { lat: 40.7648, lon: -73.8317 },
  jamaica: { lat: 40.7021, lon: -73.7879 },
  "forest-hills": { lat: 40.7196, lon: -73.8448 },
  maspeth: { lat: 40.7267, lon: -73.9039 },
  "hunts-point": { lat: 40.8098, lon: -73.8838 },
  "mott-haven": { lat: 40.8120, lon: -73.9249 },
  riverdale: { lat: 40.9005, lon: -73.9126 },
  "throgs-neck": { lat: 40.8218, lon: -73.8224 },
  "todt-hill": { lat: 40.5911, lon: -74.1100 },
  "st-george": { lat: 40.6445, lon: -74.0768 },
  "new-dorp": { lat: 40.5742, lon: -74.1175 },
};

function boroughGeo(stateSlug: string): { lat: number; lon: number } {
  return BOROUGH_GEO[stateSlug] ?? BOROUGH_GEO.manhattan;
}

function cityGeo(stateSlug: string, citySlug: string): { lat: number; lon: number } {
  return NEIGHBORHOOD_GEO[citySlug] ?? boroughGeo(stateSlug);
}

/** NYC borough PostalAddress block built from an Office entry. */
function postalAddress(office: Office) {
  return {
    "@type": "PostalAddress",
    streetAddress: office.address,
    addressLocality: office.city,
    addressRegion: "NY",
    postalCode: office.zip,
    addressCountry: "US",
  } as const;
}

/** Shared `areaServed` array — five NYC boroughs. */
function boroughsAreaServed() {
  return OFFICES.map((o) => ({
    "@type": "City",
    name: `${o.state}, NYC`,
  }));
}

/** Try to match a Service to a PRICING tier; returns {price, unit} or null. */
function priceForService(service: Service): { price: string; unit: string } | null {
  switch (service.category) {
    case "roadside":
      return { price: PRICING.emergency.price, unit: PRICING.emergency.unit };
    case "light-duty":
      return { price: PRICING.solo.price, unit: PRICING.solo.unit };
    case "heavy-duty":
    case "specialty":
    case "commercial":
      return { price: PRICING.standard.price, unit: PRICING.standard.unit };
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                               Organization                                  */
/* -------------------------------------------------------------------------- */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "TowingService",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    image: LOGO_URL,
    description:
      "24/7 towing and roadside assistance across all five NYC boroughs. Light-duty, heavy-duty, flatbed, battery, tire, lockout, gas, and winch-out. Flat-rate pricing, 20–40 minute arrival, licensed and insured.",
    telephone: PHONE,
    email: EMAIL,
    priceRange: "$$",
    openingHours: "Mo-Su 00:00-23:59",
    areaServed: boroughsAreaServed(),
    sameAs: [] as string[],
    contactPoint: OFFICES.map((o) => ({
      "@type": "ContactPoint",
      contactType: "Dispatch",
      areaServed: o.state,
      telephone: o.phone,
      email: o.email,
      availableLanguage: ["English", "Spanish"],
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                         LocalBusiness per office                            */
/* -------------------------------------------------------------------------- */

export function localBusinessSchemaPerOffice(office: Office) {
  const geo = boroughGeo(office.stateSlug);
  return {
    "@context": "https://schema.org",
    "@type": "TowingService",
    "@id": `${SITE_URL}/locations/${office.stateSlug}#localbusiness`,
    name: `${BRAND_NAME} — ${office.state}`,
    url: absUrl(`/locations/${office.stateSlug}`),
    image: LOGO_URL,
    logo: LOGO_URL,
    telephone: office.phone,
    email: office.email,
    priceRange: "$$",
    openingHours: "Mo-Su 00:00-23:59",
    address: postalAddress(office),
    geo: {
      "@type": "GeoCoordinates",
      latitude: geo.lat,
      longitude: geo.lon,
    },
    areaServed: {
      "@type": "City",
      name: `${office.state}, NYC`,
    },
    hasMap: office.mapUrl,
    parentOrganization: {
      "@type": "TowingService",
      "@id": `${SITE_URL}/#organization`,
      name: BRAND_NAME,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Service                                    */
/* -------------------------------------------------------------------------- */

export interface ServiceSchemaOptions {
  /** Optional URL override — defaults to /services/[slug]. */
  url?: string;
  /** Optional location context (borough + neighborhood). */
  location?: { stateName?: string; cityName?: string };
}

export function serviceSchema(service: Service, opts: ServiceSchemaOptions = {}) {
  const category = SERVICE_CATEGORIES[service.category];
  const url = opts.url ?? `/services/${service.slug}`;
  const price = priceForService(service);

  const areaServed = opts.location?.cityName
    ? {
        "@type": "Place",
        name: opts.location.cityName + (opts.location.stateName ? `, ${opts.location.stateName}` : ""),
      }
    : {
        "@type": "AdministrativeArea",
        name: "New York City",
        containedInPlace: {
          "@type": "State",
          name: "New York",
        },
      };

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    alternateName: service.subtitle,
    serviceType: category.label,
    description: service.description,
    url: absUrl(url),
    category: category.label,
    provider: {
      "@type": "TowingService",
      "@id": `${SITE_URL}/#organization`,
      name: BRAND_NAME,
      url: SITE_URL,
      telephone: PHONE,
    },
    areaServed,
    audience: {
      "@type": "Audience",
      audienceType: service.ideal.join(", "),
    },
  };

  if (price) {
    base.offers = {
      "@type": "Offer",
      price: price.price.replace(/[^0-9.]/g, ""),
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: price.price.replace(/[^0-9.]/g, ""),
        priceCurrency: "USD",
        unitText: price.unit,
      },
      availability: "https://schema.org/InStock",
      url: absUrl(url),
    };
  }

  return base;
}

/* -------------------------------------------------------------------------- */
/*                                 FAQPage                                     */
/* -------------------------------------------------------------------------- */

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                              BreadcrumbList                                 */
/* -------------------------------------------------------------------------- */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(crumbs: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absUrl(c.url),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Article                                    */
/* -------------------------------------------------------------------------- */

export interface ArticleSchemaInput {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  section?: string;
}

export function articleSchema(input: ArticleSchemaInput) {
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absUrl(input.url),
    },
    url: absUrl(input.url),
    publisher: {
      "@type": "TowingService",
      "@id": `${SITE_URL}/#organization`,
      name: BRAND_NAME,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    author: {
      "@type": "Organization",
      name: input.author ?? BRAND_NAME,
    },
  };
  if (input.image) out.image = input.image;
  if (input.datePublished) out.datePublished = input.datePublished;
  if (input.dateModified || input.datePublished) {
    out.dateModified = input.dateModified ?? input.datePublished;
  }
  if (input.section) out.articleSection = input.section;
  return out;
}

/* -------------------------------------------------------------------------- */
/*                                   Place                                     */
/* -------------------------------------------------------------------------- */

export interface PlaceSchemaInput {
  name: string;
  url: string;
  stateSlug: string;
  /** Optional neighborhood slug for a tighter geo lookup. */
  citySlug?: string;
  address?: {
    streetAddress?: string;
    city: string;
    postalCode?: string;
  };
}

export function placeSchema(input: PlaceSchemaInput) {
  const geo = input.citySlug ? cityGeo(input.stateSlug, input.citySlug) : boroughGeo(input.stateSlug);
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: input.name,
    url: absUrl(input.url),
    address: {
      "@type": "PostalAddress",
      ...(input.address?.streetAddress ? { streetAddress: input.address.streetAddress } : {}),
      addressLocality: input.address?.city ?? input.name,
      addressRegion: "NY",
      ...(input.address?.postalCode ? { postalCode: input.address.postalCode } : {}),
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: geo.lat,
      longitude: geo.lon,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                   HowTo                                     */
/* -------------------------------------------------------------------------- */

export interface HowToStep {
  name?: string;
  text: string;
}

export interface HowToSchemaInput {
  name: string;
  description: string;
  url?: string;
  steps: HowToStep[];
  totalTime?: string;
  image?: string;
}

export function howToSchema(input: HowToSchemaInput) {
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    step: input.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name ?? `Step ${i + 1}`,
      text: s.text,
    })),
  };
  if (input.url) out.url = absUrl(input.url);
  if (input.totalTime) out.totalTime = input.totalTime;
  if (input.image) out.image = input.image;
  return out;
}

/* -------------------------------------------------------------------------- */
/*                                JobPosting                                   */
/* -------------------------------------------------------------------------- */

export interface JobPostingInput {
  title: string;
  description: string;
  url: string;
  /** YYYY-MM-DD — defaults to current date. */
  datePosted?: string;
  /** YYYY-MM-DD — defaults to 60 days from datePosted. */
  validThrough?: string;
  employmentType?: string;
  /** Borough slug (manhattan, brooklyn, queens, bronx, staten-island). */
  stateSlug?: string;
  /** Optional neighborhood slug for tighter geo. */
  citySlug?: string;
  /** Optional city/borough name for addressLocality. */
  cityName?: string;
  /** Optional minimum and maximum annual salary in USD. */
  baseSalaryMin?: number;
  baseSalaryMax?: number;
  baseSalaryUnit?: "HOUR" | "YEAR" | "MONTH";
  /** Optional borough office to fill streetAddress + postalCode. */
  office?: Office;
}

export function jobPostingSchema(input: JobPostingInput) {
  const today = new Date();
  const datePosted = input.datePosted ?? today.toISOString().slice(0, 10);
  const validThrough =
    input.validThrough ??
    new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const stateSlug = input.stateSlug ?? "manhattan";
  const geo = input.citySlug ? cityGeo(stateSlug, input.citySlug) : boroughGeo(stateSlug);
  const locality = input.cityName ?? (input.stateSlug ? input.stateSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "New York");

  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: input.title,
    description: input.description,
    url: absUrl(input.url),
    datePosted,
    validThrough,
    employmentType: input.employmentType ?? "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: BRAND_NAME,
      sameAs: SITE_URL,
      logo: LOGO_URL,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(input.office?.address ? { streetAddress: input.office.address } : {}),
        addressLocality: locality,
        addressRegion: "NY",
        ...(input.office?.zip ? { postalCode: input.office.zip } : {}),
        addressCountry: "US",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: geo.lat,
        longitude: geo.lon,
      },
    },
    directApply: true,
  };

  if (input.baseSalaryMin != null || input.baseSalaryMax != null) {
    out.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        ...(input.baseSalaryMin != null ? { minValue: input.baseSalaryMin } : {}),
        ...(input.baseSalaryMax != null ? { maxValue: input.baseSalaryMax } : {}),
        unitText: input.baseSalaryUnit ?? "YEAR",
      },
    };
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/*                            Convenience combinators                          */
/* -------------------------------------------------------------------------- */

/** All five borough LocalBusiness schemas. */
export function allOfficeLocalBusinessSchemas() {
  return OFFICES.map((o) => localBusinessSchemaPerOffice(o));
}

/** ItemList helper for service / location / customer-type grids. */
export interface ItemListInput {
  name: string;
  url: string;
  description?: string;
}
export function itemListSchema(items: ItemListInput[], name?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(name ? { name } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absUrl(it.url),
      name: it.name,
      ...(it.description ? { description: it.description } : {}),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                               JsonLd component                              */
/* -------------------------------------------------------------------------- */

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

/**
 * Emit one or more JSON-LD schema objects as <script type="application/ld+json">.
 * Accepts a single schema object or an array of them. Each object becomes its
 * own <script> tag (keeps payloads small and parseable).
 */
export function JsonLd({ schema }: { schema: JsonLdValue }): ReactElement {
  const items = Array.isArray(schema) ? schema : [schema];
  return createElement(
    Fragment,
    null,
    ...items.map((item, i) =>
      createElement("script", {
        key: i,
        type: "application/ld+json",
        dangerouslySetInnerHTML: { __html: JSON.stringify(item) },
      }),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/*                 Re-exports of commonly-needed upstream types                */
/* -------------------------------------------------------------------------- */

export type { Service, Office };
export { SERVICES, OFFICES, FAQ };
