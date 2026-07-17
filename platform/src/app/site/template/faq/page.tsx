import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { faqContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = faqContent(config)
  const url = `${config.identity.url}/faq`
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

export default async function FaqPage() {
  const config = await getSiteConfig()
  const c = faqContent(config)
  return (
    <LongformArticle
      config={config}
      content={c}
      eyebrow="FAQ"
      ctaHeading="Still Have a Question?"
      ctaBody="Text us and a real person will answer — no question is too small, and there's no pressure to book."
    />
  )
}
