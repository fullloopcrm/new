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

/**
 * Stricter than requireCleaningTenant(): these specific pages ([slug],
 * [slug]/[service], services/[slug], service-areas, the NYC emergency-
 * cleaning page, the cleaner-referral page) don't just assume cleaning — they
 * hardcode NYCmaid's OWN real content (real Manhattan/Brooklyn/Long Island
 * neighborhood names, $59/$69/$89 pricing, a "Watch What Our NYC Cleaning
 * Clients Say" section). Gating on industry alone let ANY other cleaning
 * tenant reach these paths and see nycmaid's real business content — a real
 * cross-tenant content leak, not a hypothetical one (see the 2026-08-03
 * Template Preview incident). Until these pages are rebuilt on real per-
 * tenant data (Phase 3's [location] route + resolveCoverage()), only the
 * real nycmaid tenant may see them; every other cleaning tenant 404s.
 */
export async function requireNycmaidTenant(): Promise<void> {
  await requireCleaningTenant()
  const config = await getSiteConfig()
  if (!config.identity.url.includes('thenycmaid.com')) {
    notFound()
  }
}
