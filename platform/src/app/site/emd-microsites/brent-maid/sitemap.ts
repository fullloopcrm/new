import type { MetadataRoute } from 'next'
import { brentMaidConfig as config } from '@/app/site/the-florida-maid/_lib/emd/brent-maid'

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
