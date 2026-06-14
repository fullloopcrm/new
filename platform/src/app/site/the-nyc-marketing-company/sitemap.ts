// @ts-nocheck
import type { MetadataRoute } from "next";
import { serviceCategories, areas, industries } from "@/app/site/the-nyc-marketing-company/_lib/siteData";

const BASE = "https://www.thenycmarketingcompany.com";

// Static, hand-maintained top-level routes.
const STATIC_PATHS = [
  "/",
  "/about",
  "/accessibility",
  "/annual-marketing-spend-roi-calculator",
  "/artificial-intelligence-marketing-services-offered",
  "/contact",
  "/contact-nyc-marketing-company-consortium-nyc",
  "/industries-we-offer-marketing-services-for",
  "/master-marketing-checklist-last-updated-2026",
  "/nyc-marketing-101-guide",
  "/nyc-marketing-company-faqs",
  "/nyc-marketing-company-portfolio",
  "/nyc-marketing-company-services-list",
  "/nyc-marketing-pricing-guide",
  "/nyc-web-design-pricing",
  "/pricing",
  "/privacy-policy",
  "/results",
  "/reviews",
  "/services",
  "/services-areas-we-offer-marketing-services-in",
  "/terms",
  "/the-free-human+ai-seo-marketing-review",
  "/the-marketing-blog",
  "/the-marketing-blog/10-seo-mistakes-nyc-businesses-2026",
  "/the-marketing-blog/how-to-choose-digital-marketing-agency",
  "/the-marketing-blog/local-seo-vs-national-seo",
  "/whats-working-in-marketing",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = STATIC_PATHS.map((path) => ({
    url: `${BASE}${path}`,
    lastModified,
  }));

  const serviceEntries = serviceCategories.map((s) => ({
    url: `${BASE}/services/${s.slug}`,
    lastModified,
  }));

  const areaEntries = areas.map((a) => ({
    url: `${BASE}/services-areas-we-offer-marketing-services-in/${a.slug}`,
    lastModified,
  }));

  const industryEntries = industries.map((i) => ({
    url: `${BASE}/industries-we-offer-marketing-services-for/${i.slug}`,
    lastModified,
  }));

  return [...staticEntries, ...serviceEntries, ...areaEntries, ...industryEntries];
}