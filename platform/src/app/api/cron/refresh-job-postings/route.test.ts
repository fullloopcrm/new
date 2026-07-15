import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * refresh-job-postings cron — must revalidate the paths middleware.ts
 * ACTUALLY serves nycmaid's live domain from.
 *
 * middleware.ts: ROOT_SITE_TENANTS is empty and 'nycmaid' is in
 * BESPOKE_SITE_TENANTS, so siteBase = `/site/nycmaid` for nycmaid's live
 * domain (middleware.ts:401-429). The bare `/site/available-nyc-maid-jobs`
 * and `/site/careers/operations-coordinator` roots this cron used to
 * revalidate are dead code for domain routing — never served. This cron
 * exists specifically to stop career pages from going stale for Google for
 * Jobs; revalidating the wrong path reproduces exactly that bug for nycmaid.
 */

const revalidated: Array<{ path: string; type?: string }> = []

vi.mock('next/cache', () => ({
  revalidatePath: (path: string, type?: string) => {
    revalidated.push({ path, type })
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/refresh-job-postings', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  revalidated.length = 0
})

describe('refresh-job-postings cron — nycmaid live-path coverage', () => {
  it('revalidates the actual live nycmaid job/career paths (/site/nycmaid/...)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)

    const paths = revalidated.map((r) => r.path)
    expect(paths).toContain('/site/nycmaid/available-nyc-maid-jobs')
    expect(paths).toContain('/site/nycmaid/careers/commission-sales-partner')
  })
})
