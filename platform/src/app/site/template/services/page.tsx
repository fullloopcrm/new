import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { servicesContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = servicesContent(config)
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${config.identity.url}/services` },
    openGraph: { title: c.title, description: c.metaDescription, url: `${config.identity.url}/services` },
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
