import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { aboutContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import StreetwearAbout from '@/app/site/template/_components/streetwear/StreetwearAbout'

// Tenant data is request-resolved (signed x-tenant-id header), so this page is
// dynamic per tenant.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()

  if (config.layoutVariant === 'streetwear-editorial') {
    const title = `About | ${config.identity.name}`
    const description = `Global drip, local roots — where hype meets culture. ${config.identity.name} is a New York City streetwear brand born and based in Midtown Manhattan.`
    return {
      title,
      description,
      alternates: { canonical: `${config.identity.url}/about` },
      openGraph: { title, description, url: `${config.identity.url}/about` },
    }
  }

  const c = aboutContent(config)
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${config.identity.url}/about` },
    openGraph: { title: c.title, description: c.metaDescription, url: `${config.identity.url}/about` },
  }
}

export default async function AboutPage() {
  const config = await getSiteConfig()

  if (config.layoutVariant === 'streetwear-editorial') {
    return <StreetwearAbout config={config} />
  }

  const c = aboutContent(config)
  return <LongformArticle config={config} content={c} eyebrow="About us" />
}
