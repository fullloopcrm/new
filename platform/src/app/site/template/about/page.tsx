import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { aboutContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { getSeoOverride } from '@/lib/seo/overrides'

// Tenant data is request-resolved (signed x-tenant-id header), so this page is
// dynamic per tenant.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = aboutContent(config)
  const url = `${config.identity.url}/about`
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

export default async function AboutPage() {
  const config = await getSiteConfig()
  const c = aboutContent(config)
  return <LongformArticle config={config} content={c} eyebrow="About us" />
}
