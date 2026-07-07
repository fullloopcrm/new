import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { pricingContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = pricingContent(config)
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${config.identity.url}/pricing` },
    openGraph: { title: c.title, description: c.metaDescription, url: `${config.identity.url}/pricing` },
  }
}

export default async function PricingPage() {
  const config = await getSiteConfig()
  const c = pricingContent(config)
  return (
    <LongformArticle
      config={config}
      content={c}
      eyebrow="Pricing"
      ctaHeading="Get an Honest Quote"
      ctaBody="Tell us about your job and we'll give you a clear, fair price up front — the number we quote is the number you pay."
    />
  )
}
