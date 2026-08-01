import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { TENANT_SEO } from '@/lib/seo/tenant-seo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Career-page freshness cron.
//
// Every tenant career page computes its JobPosting `datePosted` at
// render time, so Google for Jobs only sees a fresh date if the page
// is actually re-rendered. ISR `revalidate` alone does NOT guarantee
// that: a low-traffic long-tail city page never regenerates until it
// is requested again, so its date freezes (that is how a listing got
// to "19 days old").
//
// This cron runs daily and invalidates the FULL-ROUTE cache for every
// tenant's career section using the `layout` tag, which is attached to
// every page nested under that section. One call per section therefore
// sweeps every city/state/neighborhood page beneath it — including any
// newly added pages — so the next crawl regenerates a fresh date.
//
// INVALIDATION ALONE IS NOT ENOUGH: `revalidatePath` only marks a route
// stale — Next only actually re-renders it on the NEXT real request. A
// long-tail job page with little/no organic traffic can sit invalidated
// for weeks with nobody (not even Googlebot) requesting it, so its
// `datePosted` stays frozen at whatever it was on its last real hit. For
// any tenant with a registered per-URL sitemap descriptor (TENANT_SEO),
// forceRegenerateJobPages() below closes that gap by fetching every
// individual job-posting URL itself right after invalidating — so every
// posting genuinely re-renders on THIS cron's schedule, not on however
// often a visitor happens to show up.
//
// NEW TENANTS ARE AUTO-COVERED. Every new tenant renders from the shared
// `/site/template`, so the `/site/template/...` roots below sweep all current
// and future template tenants' career pages with no per-tenant edits. Only
// hand-built (legacy) tenant sites with bespoke career URLs need an explicit
// entry below.

// Internal app-router section roots (post-rewrite `/site/<slug>/...`).
// `revalidatePath(root, 'layout')` invalidates the entire subtree.
const CAREER_SECTION_ROOTS: readonly string[] = [
  // Shared template — covers EVERY tenant that renders from it (all new tenants).
  '/site/template/available-nyc-maid-jobs',
  '/site/template/careers/operations-coordinator',
  // nycmaid — BESPOKE_SITE_TENANTS in middleware.ts rewrites its live domain
  // to /site/nycmaid/... (ROOT_SITE_TENANTS is empty, so the bare /site/...
  // root below is dead code for domain routing and was never being served —
  // the actual live pages were never revalidated by this cron until this fix).
  '/site/nycmaid/available-nyc-maid-jobs',
  '/site/nycmaid/careers/commission-sales-partner',
  '/site/nycmaid/careers/operations-coordinator',
  // Legacy /site root tree — kept in case any host still resolves here.
  '/site/available-nyc-maid-jobs',
  '/site/careers/operations-coordinator',
  // landscaping-in-nyc
  '/site/landscaping-in-nyc/careers',
  // nyc-mobile-salon
  '/site/nyc-mobile-salon/founding-ceo-position-search',
  '/site/nyc-mobile-salon/join',
  // nyc-tow
  '/site/nyc-tow/careers',
  // stretch-ny
  '/site/stretch-ny/careers',
  '/site/stretch-ny/jobs',
  // stretch-service
  '/site/stretch-service/careers',
  '/site/stretch-service/jobs',
  // the-florida-maid
  '/site/the-florida-maid/available-florida-maid-jobs',
  '/site/the-florida-maid/careers',
  // the-home-services-company
  '/site/the-home-services-company/careers',
  '/site/the-home-services-company/partnerships',
  // the-nyc-exterminator
  '/site/the-nyc-exterminator/careers',
  // the-nyc-interior-designer
  '/site/the-nyc-interior-designer/careers',
  // toll-trucks-near-me
  '/site/toll-trucks-near-me/careers',
  // wash-and-fold-nyc
  '/site/wash-and-fold-nyc/careers',
  // we-pay-you-junk
  '/site/we-pay-you-junk/careers',
]

// Tenants with a rich per-URL sitemap descriptor (TENANT_SEO) whose job
// postings get force-regenerated (not just cache-invalidated) below. Maps
// tenant slug -> the public path segment that marks a job-posting URL
// within that tenant's descriptor output. Add an entry here when a tenant
// with individual job-posting pages gets onboarded onto TENANT_SEO.
const FORCE_REGEN_JOB_TENANTS: Record<string, string> = {
  'the-florida-maid': '/available-florida-maid-jobs/',
}

const FORCE_REGEN_CONCURRENCY = 15

async function forceRegenerateJobPages(): Promise<{ attempted: number; failed: number }> {
  const jobUrls: string[] = []
  for (const [slug, marker] of Object.entries(FORCE_REGEN_JOB_TENANTS)) {
    const descriptor = TENANT_SEO[slug]
    if (!descriptor) continue
    for (const u of descriptor.buildUrls()) {
      if (u.loc.includes(marker)) jobUrls.push(u.loc)
    }
  }

  let failed = 0
  for (let i = 0; i < jobUrls.length; i += FORCE_REGEN_CONCURRENCY) {
    const batch = jobUrls.slice(i, i + FORCE_REGEN_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((url) => fetch(url, { cache: 'no-store', headers: { 'x-seo-refresh': '1' } })),
    )
    failed += results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length
  }
  return { attempted: jobUrls.length, failed }
}

export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  const refreshed: string[] = []
  const failed: { path: string; error: string }[] = []

  for (const root of CAREER_SECTION_ROOTS) {
    try {
      revalidatePath(root, 'layout')
      refreshed.push(root)
    } catch (error) {
      failed.push({
        path: root,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const forceRegen = await forceRegenerateJobPages().catch((error) => ({
    attempted: 0,
    failed: 0,
    error: error instanceof Error ? error.message : String(error),
  }))

  return NextResponse.json({
    refreshed: refreshed.length,
    failed: failed.length,
    sections: refreshed,
    errors: failed,
    forceRegen,
    at: new Date().toISOString(),
  })
}
