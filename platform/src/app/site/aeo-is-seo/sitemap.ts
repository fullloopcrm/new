import type { MetadataRoute } from 'next'

const SITE_URL = 'https://aeoisseo.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: '2026-08-22',
      changeFrequency: 'monthly',
      priority: 1.0,
    },
  ]
}
