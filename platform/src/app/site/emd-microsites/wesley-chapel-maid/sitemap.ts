import type { MetadataRoute } from 'next'
import { wesleyChapelMaidConfig as config } from '@/app/site/the-florida-maid/_lib/emd/wesley-chapel-maid'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `https://www.${config.domain}`,
      lastModified: new Date('2026-07-31'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
