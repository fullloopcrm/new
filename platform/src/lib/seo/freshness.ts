/**
 * Job-posting freshness — part of seomgr, not a bolt-on cron.
 *
 * Google for Jobs treats an old `datePosted` as a signal the listing may be
 * filled/expired and can drop it from the Jobs experience, even with a
 * future `validThrough` set. Every tenant job-posting page computes
 * `datePosted` at render time (a rolling "N days ago" window), so Google
 * only sees a fresh date if the page actually re-renders — ISR alone
 * doesn't guarantee that for a low-traffic long-tail page.
 *
 * Two tiers, both run every cycle:
 *
 * 1. INVALIDATE — `revalidatePath(root, 'layout')` on every tenant's career
 *    section, including the shared `/site/template` roots. Cheap, and the
 *    shared roots mean any NEW tenant is auto-covered with zero edits here.
 *    But invalidation alone only marks a route stale; Next re-renders it on
 *    the next real request, so a low-traffic long-tail page can sit
 *    invalidated for weeks with nobody (not even Googlebot) hitting it.
 *
 * 2. FORCE-REGENERATE — for any tenant registered on the shared TENANT_SEO
 *    sitemap engine, fetch every URL it tags `kind: 'job-posting'` directly,
 *    guaranteeing a real re-render on THIS cron's schedule. Onboarding a
 *    tenant onto TENANT_SEO (already required for its sitemap) is what
 *    upgrades it from tier 1 to tier 2 — no separate registration step.
 */
import { revalidatePath } from 'next/cache'
import { TENANT_SEO } from './tenant-seo'

const FORCE_REGEN_CONCURRENCY = 15

// Career-section roots not yet covered by a TENANT_SEO descriptor (tier 1
// only). Shared `/site/template` roots auto-cover every current and future
// template tenant; the rest are legacy/bespoke tenant sites.
const CAREER_SECTION_ROOTS: readonly string[] = [
  '/site/template/available-nyc-maid-jobs',
  '/site/template/careers/operations-coordinator',
  '/site/landscaping-in-nyc/careers',
  '/site/nyc-mobile-salon/founding-ceo-position-search',
  '/site/nyc-mobile-salon/join',
  '/site/nyc-tow/careers',
  '/site/stretch-ny/careers',
  '/site/stretch-ny/jobs',
  '/site/stretch-service/careers',
  '/site/stretch-service/jobs',
  '/site/the-home-services-company/careers',
  '/site/the-home-services-company/partnerships',
  '/site/the-nyc-exterminator/careers',
  '/site/the-nyc-interior-designer/careers',
  '/site/toll-trucks-near-me/careers',
  '/site/wash-and-fold-nyc/careers',
  '/site/we-pay-you-junk/careers',
]

export interface FreshnessResult {
  invalidated: number
  invalidateErrors: { path: string; error: string }[]
  tenants: number
  attempted: number
  failed: number
  errors: { url: string; error: string }[]
}

export function getJobPostingUrls(): { slug: string; url: string }[] {
  const out: { slug: string; url: string }[] = []
  for (const descriptor of Object.values(TENANT_SEO)) {
    for (const u of descriptor.buildUrls()) {
      if (u.kind === 'job-posting') out.push({ slug: descriptor.slug, url: u.loc })
    }
  }
  return out
}

export async function refreshJobPostings(): Promise<FreshnessResult> {
  let invalidated = 0
  const invalidateErrors: { path: string; error: string }[] = []
  for (const root of CAREER_SECTION_ROOTS) {
    try {
      revalidatePath(root, 'layout')
      invalidated++
    } catch (error) {
      invalidateErrors.push({ path: root, error: error instanceof Error ? error.message : String(error) })
    }
  }

  const urls = getJobPostingUrls()
  const tenants = new Set(urls.map((u) => u.slug)).size
  const errors: { url: string; error: string }[] = []
  let failed = 0

  for (let i = 0; i < urls.length; i += FORCE_REGEN_CONCURRENCY) {
    const batch = urls.slice(i, i + FORCE_REGEN_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(({ url }) => fetch(url, { cache: 'no-store', headers: { 'x-seo-refresh': '1' } })),
    )
    results.forEach((r, idx) => {
      if (r.status === 'rejected') {
        failed++
        errors.push({ url: batch[idx].url, error: String(r.reason) })
      } else if (!r.value.ok) {
        failed++
        errors.push({ url: batch[idx].url, error: `HTTP ${r.value.status}` })
      }
    })
  }

  return { invalidated, invalidateErrors, tenants, attempted: urls.length, failed, errors }
}
