// @ts-nocheck
import type { MetadataRoute } from "next";
import { STATES } from "@/app/site/theroadsidehelper/_data/cities";
import { SERVICES } from "@/app/site/theroadsidehelper/_data/services";
import { CUSTOMER_TYPES } from "@/app/site/theroadsidehelper/_data/customer-types";
import { BLOG_POSTS } from "@/app/site/theroadsidehelper/_data/blog-posts";

export const SITE = "https://www.theroadsidehelper.com";
export const SITEMAP_CHUNK_SIZE = 25_000;

export function buildSitemapEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const staticPages = [
    "",
    "/about",
    "/services",
    "/pricing",
    "/faq",
    "/contact-the-roadside-helper",
    "/book-roadside-help-now",
    "/apply-to-join-our-team",
    "/commercial",
    "/franchise",
    "/blog",
    "/careers",
    "/locations",
    "/who-we-serve",
  ];

  for (const path of staticPages) {
    entries.push({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: path === "" ? 1.0 : 0.8,
    });
  }

  for (const post of BLOG_POSTS) {
    entries.push({
      url: `${SITE}/blog/${post.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const service of SERVICES) {
    entries.push({
      url: `${SITE}/services/${service.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const customer of CUSTOMER_TYPES) {
    entries.push({
      url: `${SITE}/who-we-serve/${customer.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const state of STATES) {
    entries.push({
      url: `${SITE}/locations/${state.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
    entries.push({
      url: `${SITE}/careers/${state.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });

    for (const city of state.cities) {
      entries.push({
        url: `${SITE}/locations/${state.slug}/${city.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
      entries.push({
        url: `${SITE}/careers/${state.slug}/${city.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.4,
      });
      entries.push({
        url: `${SITE}/locations/${state.slug}/${city.slug}/roadside-help-in-${city.slug}-guide-tips-and-costs`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      });

      for (const service of SERVICES) {
        entries.push({
          url: `${SITE}/locations/${state.slug}/${city.slug}/${service.slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  }

  for (const ct of CUSTOMER_TYPES) {
    for (const state of STATES) {
      entries.push({
        url: `${SITE}/who-we-serve/${ct.slug}/${state.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });

      for (const city of state.cities) {
        entries.push({
          url: `${SITE}/who-we-serve/${ct.slug}/${state.slug}/${city.slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }

    for (const service of SERVICES) {
      entries.push({
        url: `${SITE}/who-we-serve/${ct.slug}/${service.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}

export function getSitemapChunkCount(): number {
  const total = buildSitemapEntries().length;
  return Math.max(1, Math.ceil(total / SITEMAP_CHUNK_SIZE));
}