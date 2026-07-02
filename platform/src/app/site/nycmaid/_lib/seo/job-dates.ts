// Single source of truth for JobPosting freshness dates (cleaner + sales).
//
// Google Jobs treats a posting as "fresh" primarily off datePosted + the page
// being re-crawled (sitemap lastmod). We roll datePosted on a fixed 3-day
// window so it stays recent, while staying STABLE within each window (every
// render inside the same 3-day bucket returns the identical date). Stable dates
// avoid Google seeing a posting whose date jitters on every crawl, which reads
// as manipulation. The refresh-job-postings cron revalidates the pages every 3
// days so the window advances and the date updates.
export const JOB_WINDOW_MS = 3 * 24 * 60 * 60 * 1000 // 3 days
export const JOB_REVALIDATE_SECONDS = 3 * 24 * 60 * 60 // 259200

export function jobDates(): { datePosted: string; validThrough: string } {
  const windowStart = Math.floor(Date.now() / JOB_WINDOW_MS) * JOB_WINDOW_MS
  // datePosted = start of the current 3-day window (0–3 days old — always fresh).
  const datePosted = new Date(windowStart).toISOString().split('T')[0]
  // validThrough = 90 days out, so the posting never looks expired between renews.
  const validThrough = new Date(windowStart + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return { datePosted, validThrough }
}
