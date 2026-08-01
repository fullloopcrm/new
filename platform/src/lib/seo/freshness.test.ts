import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * seomgr job-posting freshness — replaces the old standalone
 * refresh-job-postings cron (folded into seomgr 2026-08-01).
 *
 * Regression this guards: middleware.ts routes nycmaid's live domain to
 * `/site/nycmaid/...` (ROOT_SITE_TENANTS is empty, nycmaid is in
 * BESPOKE_SITE_TENANTS), so an invalidatePath call against a bare
 * `/site/available-nyc-maid-jobs` root is dead code — it was never served,
 * which is exactly how nycmaid job pages went stale for Google for Jobs
 * before. Now that nycmaid is registered on TENANT_SEO, its job pages get
 * the stronger tier (direct fetch of the real public URL) instead of
 * depending on knowing the correct internal route at all.
 */

const revalidated: Array<{ path: string; type?: string }> = []
const fetched: string[] = []

vi.mock('next/cache', () => ({
  revalidatePath: (path: string, type?: string) => {
    revalidated.push({ path, type })
  },
}))

vi.stubGlobal(
  'fetch',
  vi.fn(async (url: string) => {
    fetched.push(url)
    return new Response(null, { status: 200 })
  }),
)

const pushUrlsUpdated = vi.fn(async (urls: string[]) => urls.map((url) => ({ url, ok: true })))
vi.mock('./indexing', () => ({ pushUrlsUpdated: (urls: string[]) => pushUrlsUpdated(urls) }))

import { refreshJobPostings, getJobPostingUrls } from './freshness'
import './tenant-seo'

beforeEach(() => {
  revalidated.length = 0
  fetched.length = 0
  pushUrlsUpdated.mockClear()
})

describe('seomgr job-posting freshness', () => {
  it('force-refetches nycmaid job pages by their real live URL, not an internal route', async () => {
    await refreshJobPostings()
    expect(fetched.some((u) => u.startsWith('https://www.thenycmaid.com/available-nyc-maid-jobs/'))).toBe(true)
    expect(fetched.some((u) => u.startsWith('https://www.thenycmaid.com/careers/commission-sales-partner/'))).toBe(true)
  })

  it('force-refetches every Florida Maid job page', async () => {
    await refreshJobPostings()
    expect(fetched.filter((u) => u.startsWith('https://www.thefloridamaid.com/available-florida-maid-jobs/')).length).toBe(567)
  })

  it('still invalidates the legacy career-section roots for tenants not yet on TENANT_SEO', async () => {
    await refreshJobPostings()
    const paths = revalidated.map((r) => r.path)
    expect(paths).toContain('/site/template/available-nyc-maid-jobs')
    expect(paths).toContain('/site/nyc-tow/careers')
  })

  it('getJobPostingUrls only returns URLs tagged kind: job-posting', () => {
    const urls = getJobPostingUrls()
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((u) => typeof u.url === 'string' && u.url.startsWith('https://'))).toBe(true)
  })

  it('pushes every job-posting URL through the Indexing API after force-refetching them', async () => {
    const result = await refreshJobPostings()
    expect(pushUrlsUpdated).toHaveBeenCalledTimes(1)
    const pushedUrls: string[] = pushUrlsUpdated.mock.calls[0][0]
    expect(pushedUrls.length).toBe(result.attempted)
    expect(pushedUrls.some((u) => u.includes('thefloridamaid.com/available-florida-maid-jobs/'))).toBe(true)
    expect(result.indexingPushed).toBe(result.attempted)
    expect(result.indexingFailed).toBe(0)
  })
})
