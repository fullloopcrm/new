import type { MetadataRoute } from 'next'
import { washAndFoldQueensConfig as config } from '@/app/site/wash-and-fold-nyc/_lib/emd/washandfoldqueens'

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
