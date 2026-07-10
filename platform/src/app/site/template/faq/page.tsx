import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { faqContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = faqContent(config)
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${config.identity.url}/faq` },
    openGraph: { title: c.title, description: c.metaDescription, url: `${config.identity.url}/faq` },
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
