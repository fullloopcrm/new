import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { careersContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = careersContent(config)
  const url = `${config.identity.url}/careers`
  const override = await getSeoOverride(url)
  const title = override?.title || c.title
  const description = override?.description || c.metaDescription
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
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
