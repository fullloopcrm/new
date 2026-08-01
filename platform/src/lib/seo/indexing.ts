/**
 * seomgr — Google Indexing API push for job-posting URLs.
 *
 * The force-refetch in freshness.ts guarantees a page actually re-renders so
 * its own `datePosted` is current, but Google still discovers that on its own
 * crawl schedule (hours to days). Pushing URL_UPDATED here tells Google to
 * recrawl within minutes instead — the real fix for job pages specifically
 * (per Google's own docs, JobPosting/BroadcastEvent are the only content
 * types this API is meant for).
 *
 * BLOCKED as of 2026-08-01: the "Web Search Indexing API" is disabled in the
 * fullloop-seo GCP project (confirmed live — a real getMetadata call returns
 * 403 SERVICE_DISABLED, project 260261399739). Everything else needed is
 * already in place: the seo-monitor@fullloop-seo.iam.gserviceaccount.com
 * service account already holds `siteFullUser` on both sc-domain:
 * thefloridamaid.com and sc-domain:thenycmaid.com (verified live via
 * gsc.ts listSites()), which is the Search Console ownership grant this API
 * requires — no further Search Console action needed.
 *
 * One remaining action, requires GCP console login (cannot be done from
 * code/CLI here — no gcloud available, and enabling an API is a real
 * account-level action):
 *   https://console.developers.google.com/apis/api/indexing.googleapis.com/overview?project=260261399739
 *   -> click Enable. Takes effect within minutes.
 *
 * Every function here fails open (returns ok:false, never throws past this
 * module) so callers can wire it in now and it activates automatically the
 * moment the API is enabled — no code change needed at that point.
 */
import { getAccessTokenForScope } from './gsc'

const INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing'
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish'

export type IndexingResult = { url: string; ok: boolean; error?: string }

async function publish(url: string, type: 'URL_UPDATED' | 'URL_DELETED'): Promise<IndexingResult> {
  try {
    const token = await getAccessTokenForScope(INDEXING_SCOPE)
    const res = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { url, ok: false, error: `HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}` }
    }
    return { url, ok: true }
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Push URL_UPDATED for every URL — one call each, concurrency-capped. */
export async function pushUrlsUpdated(urls: string[], concurrency = 15): Promise<IndexingResult[]> {
  const out: IndexingResult[] = []
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const results = await Promise.all(batch.map((u) => publish(u, 'URL_UPDATED')))
    out.push(...results)
  }
  return out
}
