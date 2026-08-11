import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { contactContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import StreetwearContact from '@/app/site/template/_components/streetwear/StreetwearContact'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()

  if (config.layoutVariant === 'streetwear-editorial') {
    const title = `Contact | ${config.identity.name}`
    const description = `Order questions, sizing, drops — reach ${config.identity.name} by text or email.`
    return {
      title,
      description,
      alternates: { canonical: `${config.identity.url}/contact` },
      openGraph: { title, description, url: `${config.identity.url}/contact` },
    }
  }

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

  if (config.layoutVariant === 'streetwear-editorial') {
    return <StreetwearContact config={config} />
  }

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
