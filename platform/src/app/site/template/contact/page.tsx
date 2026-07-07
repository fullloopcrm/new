import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { contactContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = contactContent(config)
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${config.identity.url}/contact` },
    openGraph: { title: c.title, description: c.metaDescription, url: `${config.identity.url}/contact` },
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
