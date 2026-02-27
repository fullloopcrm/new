import type { MetadataRoute } from 'next'
import { getAllCitySlugs } from '@/lib/marketing/locations'
import { getAllServiceSlugs } from '@/lib/marketing/services'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://fullloopcrm.com'
  const now = new Date()

  // Static marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/features`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/businesses`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/locations`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/crm-partnership-request-form`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/feedback`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  // Dynamic location pages
  const citySlugs = getAllCitySlugs()
  const locationPages: MetadataRoute.Sitemap = citySlugs.map((slug) => ({
    url: `${baseUrl}/locations/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Dynamic service pages
  const serviceSlugs = getAllServiceSlugs()
  const servicePages: MetadataRoute.Sitemap = serviceSlugs.map((slug) => ({
    url: `${baseUrl}/services/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Combo pages (city + service) — only top 20 cities to keep sitemap manageable
  const topCitySlugs = citySlugs.slice(0, 20)
  const comboPages: MetadataRoute.Sitemap = []
  for (const city of topCitySlugs) {
    for (const service of serviceSlugs) {
      comboPages.push({
        url: `${baseUrl}/locations/${city}/${service}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })
    }
  }

  return [...staticPages, ...locationPages, ...servicePages, ...comboPages]
}
