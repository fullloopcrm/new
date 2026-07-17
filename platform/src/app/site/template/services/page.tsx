import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { servicesContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = servicesContent(config)
  const url = `${config.identity.url}/services`
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

export default async function ServicesPage() {
  const config = await getSiteConfig()
  const c = servicesContent(config)
  return (
    <LongformArticle
      config={config}
      content={c}
      eyebrow="What we do"
      ctaHeading="Let's Get Your Job Scheduled"
      ctaBody="Tell us what you need and we'll scope it honestly, quote it up front, and get you on the calendar."
    />
  )
}
