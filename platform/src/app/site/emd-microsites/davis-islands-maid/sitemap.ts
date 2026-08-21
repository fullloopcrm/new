import type { MetadataRoute } from 'next'
import { davisIslandsMaidConfig as config } from '@/app/site/the-florida-maid/_lib/emd/davis-islands-maid'

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
