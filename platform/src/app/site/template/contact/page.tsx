import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { contactContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = contactContent(config)
  const url = `${config.identity.url}/contact`
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

export default async function ContactPage() {
  const config = await getSiteConfig()
  const c = contactContent(config)
  return (
    <LongformArticle
      config={config}
      content={c}
      eyebrow="Contact"
      ctaHeading="Reach Out Today"
      ctaBody="Text, call, or book online — a fast, honest response with no pressure and no obligation."
    />
  )
}
