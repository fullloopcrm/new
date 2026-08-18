import type { MetadataRoute } from 'next'
import { northHillMaidConfig as config } from '@/app/site/the-florida-maid/_lib/emd/north-hill-maid'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `https://www.${config.domain}`,
      lastModified: new Date('2026-08-18'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
