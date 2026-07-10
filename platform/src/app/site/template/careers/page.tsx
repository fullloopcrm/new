import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { careersContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = careersContent(config)
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${config.identity.url}/careers` },
    openGraph: { title: c.title, description: c.metaDescription, url: `${config.identity.url}/careers` },
  }
}

export default async function CareersPage() {
  const config = await getSiteConfig()
  const c = careersContent(config)
  return (
    <LongformArticle
      config={config}
      content={c}
      eyebrow="Careers"
      ctaHeading="Come Work With Us"
      ctaBody="Reach out and tell us about yourself — we hire for reliability and character, and we treat our team right."
    />
  )
}
