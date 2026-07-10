import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import type { SiteConfig } from '@/app/site/template/_config/types'

/**
 * Gate the national VA SEO routes. They live in the shared template but must
 * only render for virtual-assistant tenants — every other tenant (cleaning,
 * trades) gets 404 so these pages never surface on the wrong brand. Returns the
 * resolved SiteConfig for convenience.
 */
export async function requireVaTenant(): Promise<SiteConfig> {
  const config = await getSiteConfig()
  if (!industryProfile(config.industry).isVirtualAssistant) notFound()
  return config
}
