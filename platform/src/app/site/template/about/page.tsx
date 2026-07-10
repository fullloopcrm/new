import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { aboutContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'

// Tenant data is request-resolved (signed x-tenant-id header), so this page is
// dynamic per tenant.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
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
  const c = aboutContent(config)
  return <LongformArticle config={config} content={c} eyebrow="About us" />
}
