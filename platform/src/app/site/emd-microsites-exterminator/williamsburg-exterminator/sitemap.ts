import type { MetadataRoute } from 'next'
import { williamsburgExterminatorConfig as config } from '@/app/site/the-nyc-exterminator/_lib/emd/williamsburg-exterminator'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `https://www.${config.domain}`,
      lastModified: new Date('2026-08-21'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
