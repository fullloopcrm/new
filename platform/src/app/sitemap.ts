import type { MetadataRoute } from 'next'
import {
  industries,
  metros,
  getAllCombos,
  generateIndustrySlug,
  generateLocationSlug,
} from '@/lib/marketing/combos'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://homeservicesbusinesscrm.com'
  const now = new Date()

  // Static marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/full-loop-crm-service-features`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/full-loop-crm-service-business-industries`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/why-you-should-choose-full-loop-crm-for-your-business`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/partner-with-full-loop-crm`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/about-full-loop-crm`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/full-loop-crm-frequently-asked-questions`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/full-loop-crm-101-educational-tips`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/waitlist`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/accessibility`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // 51 industry pages — /industry/{slug}
  const industryPages: MetadataRoute.Sitemap = industries.map((i) => ({
    url: `${baseUrl}/industry/${generateIndustrySlug(i)}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // 400 location pages — /location/{slug}
  const locationPages: MetadataRoute.Sitemap = metros.map((m) => ({
    url: `${baseUrl}/location/${generateLocationSlug(m)}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // 20,400 industry × location combo pages — /{slug}
  const combos = getAllCombos()
  const comboPages: MetadataRoute.Sitemap = combos.map((c) => ({
    url: `${baseUrl}/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...industryPages, ...locationPages, ...comboPages]
}
