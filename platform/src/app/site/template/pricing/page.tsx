import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { pricingContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = pricingContent(config)
  const url = `${config.identity.url}/pricing`
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
