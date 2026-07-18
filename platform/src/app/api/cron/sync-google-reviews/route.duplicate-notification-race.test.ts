/**
 * GET /api/cron/sync-google-reviews — concurrent-invocation duplicate
 * "N new reviews" notification race.
 *
 * The old flow computed "new this run" via a per-review check-then-act
 * (SELECT google_reviews for the review id, upsert unconditionally, count
 * as new if the SELECT found nothing), then fired an unconditional
 * `notifications` insert once per tenant whenever any reviews were new --
 * no DB constraint behind the count. Two overlapping invocations for the
 * same tenant (a slow round-trip across many review pages bleeding into the
 * next tick, a manual re-trigger) can both read the same not-yet-synced
 * reviews as "new" before either upsert commits, and both fire a duplicate
 * tenant-visible dashboard notification for the identical batch.
 *
 * Fix: insert-first claim on google_review_sync_alerts(fingerprint) —
 * fingerprint = tenant id + sorted new review ids — before the notifications
 * insert. A review's id is permanently written to google_reviews by the
 * same upsert, so the identical fingerprint recurring after the race window
 * closes is structurally unreachable — same ephemeral-fingerprint reasoning
 * as cron/comms-monitor's fix, see
 * 2026_07_18_google_review_sync_alerts_dedup.sql.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/google', () => ({
  getValidAccessToken: vi.fn(async (_tenantId: string) => 'fake-access-token'),
  getGoogleBusiness: vi.fn(async (_tenantId: string) => ({
    location_name: 'accounts/1/locations/1',
  })),
}))

const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify({
  reviews: [{
    reviewId: 'g-review-99',
    starRating: 'FIVE',
    reviewer: { displayName: 'Jane Doe' },
    comment: 'Great work!',
    createTime: '2026-07-18T00:00:00.000Z',
  }],
}), { status: 200 }))
vi.stubGlobal('fetch', fetchMock)

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/sync-google-reviews', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  fetchMock.mockClear()

  h.fake = createFakeSupabase({
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', google_tokens: { access_token: 'x' }, google_business: null }],
    google_reviews: [],
    google_review_sync_alerts: [],
  })
  h.fake._addUniqueConstraint('google_review_sync_alerts', 'fingerprint')
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

describe('concurrent sync-google-reviews invocations racing the same new-review batch', () => {
  it('notifies exactly once', async () => {
    const [first, second] = await Promise.all([GET(cronReq()), GET(cronReq())])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const claims = h.fake!._all('google_review_sync_alerts')
    expect(claims).toHaveLength(1)

    const notifs = h.fake!._all('notifications').filter((r) => r.type === 'feedback')
    expect(notifs).toHaveLength(1)
  })

  it('notifies again for a genuinely different new-review batch (different fingerprint)', async () => {
    await GET(cronReq())
    expect(h.fake!._all('notifications').filter((r) => r.type === 'feedback')).toHaveLength(1)

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      reviews: [{
        reviewId: 'g-review-100',
        starRating: 'FOUR',
        reviewer: { displayName: 'John Smith' },
        comment: 'Good job',
        createTime: '2026-07-19T00:00:00.000Z',
      }],
    }), { status: 200 }))

    await GET(cronReq())
    expect(h.fake!._all('notifications').filter((r) => r.type === 'feedback')).toHaveLength(2)
    expect(h.fake!._all('google_review_sync_alerts')).toHaveLength(2)
  })
})
