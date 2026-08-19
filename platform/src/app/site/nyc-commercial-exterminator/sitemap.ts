import type { MetadataRoute } from "next";
import {
  getAllServices,
  getAllNeighborhoods,
  getCategories,
  categoryToSlug,
} from "@/app/site/nyc-commercial-exterminator/_lib/data";
import { getAllTips } from "@/app/site/nyc-commercial-exterminator/_data/tips";
import { SITE_URL } from "@/app/site/nyc-commercial-exterminator/_lib/seo";

const MAX_URLS = 49999;

// Regenerate the sitemap every 7 days so that <lastmod> stays in sync with
// our weekly JobPosting refresh (cron in vercel.json revalidates job pages
// + this sitemap path together). Without this the sitemap freezes at build
// time and Google won't know to re-crawl the refreshed pages.
export const revalidate = 604800;

export default function sitemap(): MetadataRoute.Sitemap {
  const services = getAllServices();
  const neighborhoods = getAllNeighborhoods();
  const categories = getCategories();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/areas`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/reviews`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/schedule-service`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/careers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/pest-control-tips`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const tipPages: MetadataRoute.Sitemap = getAllTips().map((t) => ({
    url: `${SITE_URL}/pest-control-tips/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const servicePages: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${SITE_URL}/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/services/${categoryToSlug(c)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const neighborhoodPages: MetadataRoute.Sitemap = neighborhoods.map((n) => ({
    url: `${SITE_URL}/areas/${n.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const highPriorityUrls = [
    ...staticPages,
    ...servicePages,
    ...categoryPages,
    ...neighborhoodPages,
    ...tipPages,
  ];

  const careersPages: MetadataRoute.Sitemap = neighborhoods.map((n) => ({
    url: `${SITE_URL}/careers/${n.slug}-exterminator-jobs`,
    lastModified: new Date(),
    // Bumped from "monthly" to "weekly" to match the cron-driven JobPosting
    // refresh cadence. Tells Google these pages change every 7 days.
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const moneyPageBudget = MAX_URLS - highPriorityUrls.length - careersPages.length;

  const moneyPages: MetadataRoute.Sitemap = services.flatMap((s) =>
    neighborhoods.map((n) => ({
      url: `${SITE_URL}/${s.slug}/${n.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))
  ).slice(0, moneyPageBudget);

  return [...highPriorityUrls, ...careersPages, ...moneyPages];
}
