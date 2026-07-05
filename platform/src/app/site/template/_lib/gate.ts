import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'

/**
 * Hide cleaning-data-coupled SEO pages from non-cleaning tenants.
 *
 * The template's location/service/blog pages are built on a cleaning-specific
 * data model (neighborhood `cleaning_challenges`, $59/hr copy, maid-service
 * editorial) that can't be hand-genericized without going thin or incoherent.
 * Until SIGNAL/AI generates per-industry versions, a non-cleaning tenant should
 * 404 these paths rather than serve a plumber a cleaning article.
 *
 * Call at the top of a gated page's async component (and generateMetadata if it
 * has one). Cleaning tenants pass through unchanged.
 */
export async function requireCleaningTenant(): Promise<void> {
  const config = await getSiteConfig()
  if (!industryProfile(config.industry).isCleaning) {
    notFound()
  }
}
