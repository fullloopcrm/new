import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { protectCronAPI } from '@/lib/nycmaid/auth'

// Career-page freshness cron.
//
// Every tenant career page computes its JobPosting `datePosted` at
// render time, so Google for Jobs only sees a fresh date if the page
// is actually re-rendered. ISR `revalidate` alone does NOT guarantee
// that: a low-traffic long-tail city page never regenerates until it
// is requested again, so its date freezes (that is how a listing got
// to "19 days old").
//
// This cron runs on the 1st and 16th of each month (~every 15 days, matching
// the Google Jobs freshness window) and invalidates the FULL-ROUTE cache for
// every tenant's career section using the `layout` tag, which is attached to
// every page nested under that section. One call per section therefore
// sweeps every city/state/neighborhood page beneath it — including any
// newly added pages — so the next crawl regenerates a fresh date.
//
// Previously ran daily (0 3 * * *): a full-layout sweep of 22 section roots,
// each fanning out to many nested borough/neighborhood/city pages, 30x/month
// when only 2x/month was ever needed for the 15-day freshness requirement —
// a likely driver of excess ISR Writes cost with no SEO benefit (Google Jobs
// only needs a date that isn't stale beyond ~15 days, not a daily-fresh one).
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
  // nycmaid (root tenant / legacy shared tree)
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
  // wash-and-fold-hoboken
  '/site/wash-and-fold-hoboken/available-nyc-maid-jobs',
  '/site/wash-and-fold-hoboken/careers/operations-coordinator',
  // wash-and-fold-nyc
  '/site/wash-and-fold-nyc/careers',
  // we-pay-you-junk
  '/site/we-pay-you-junk/careers',
]

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

  return NextResponse.json({
    refreshed: refreshed.length,
    failed: failed.length,
    sections: refreshed,
    errors: failed,
    at: new Date().toISOString(),
  })
}
