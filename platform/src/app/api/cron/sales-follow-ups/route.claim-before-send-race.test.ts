/**
 * GET /api/cron/sales-follow-ups — check-then-act race + no re-arm on
 * reschedule.
 *
 * The old dedup queried `notifications` for an existing `type = 'follow_up'`
 * row (matched by `metadata.deal_id`) created within the last hour, THEN
 * looped matching deals and notified unconditionally -- a classic
 * check-then-act race, same bug class as this session's other
 * claim-before-send fixes. Two overlapping invocations could both read zero
 * "existing" notifications for the same deal and both email/text the admin.
 *
 * Fix: a dedicated `deals.follow_up_notified_at` column, claimed via
 * compare-and-swap (`<>` against the deal's own `follow_up_at`) BEFORE
 * notify(). See 2026_07_17_deals_follow_up_notified_at.sql for why this is
 * a sentinel-default column, not the usual nullable-NULL-means-pending one.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

const notify = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (args: unknown) => notify(args) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async (_message: string) => undefined) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/sales-follow-ups', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const NOW = new Date('2026-07-17T10:00:00.000Z')
const FOLLOW_UP_AT = '2026-07-17T09:30:00.000Z' // 30 min ago -- inside the 1hr window

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  notify.mockClear()
  h.fake = createFakeSupabase({
    deals: [{
      id: 'deal-1', tenant_id: 'tenant-A', status: 'active',
      follow_up_at: FOLLOW_UP_AT, follow_up_note: 'Call back',
      follow_up_notified_at: '1970-01-01T00:00:00.000Z',
      clients: { name: 'Jane Doe', phone: '+15559998888' },
    }],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('concurrent sales-follow-ups invocations racing the same deal', () => {
  it('notifies exactly once', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(notify).toHaveBeenCalledTimes(1)
    expect(firstJson.reminded + secondJson.reminded).toBe(1)
    expect(h.fake!._all('deals')[0].follow_up_notified_at).toBe(FOLLOW_UP_AT)
  })

  it('claims follow_up_notified_at BEFORE calling notify, not after', async () => {
    let claimedAtSendTime: unknown = 'not-yet-checked'
    notify.mockImplementationOnce(async () => {
      claimedAtSendTime = h.fake!._all('deals')[0].follow_up_notified_at
      return { success: true }
    })

    await GET(req())

    expect(claimedAtSendTime).toBe(FOLLOW_UP_AT)
  })

  it('does not re-notify on a later cron pass for the same follow_up_at', async () => {
    await GET(req())
    expect(notify).toHaveBeenCalledTimes(1)

    const again = await GET(req())
    const againJson = await again.json()
    expect(againJson.reminded).toBe(0)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('re-arms and notifies again once the deal is rescheduled to a new follow_up_at', async () => {
    await GET(req())
    expect(notify).toHaveBeenCalledTimes(1)

    // Simulate PATCH /api/deals/[id] rescheduling follow_up_at -- resets
    // follow_up_notified_at back to the sentinel (same commit).
    const deal = h.fake!._all('deals')[0]
    const NEW_FOLLOW_UP_AT = '2026-07-17T09:45:00.000Z'
    deal.follow_up_at = NEW_FOLLOW_UP_AT
    deal.follow_up_notified_at = '1970-01-01T00:00:00Z'

    const again = await GET(req())
    const againJson = await again.json()
    expect(againJson.reminded).toBe(1)
    expect(notify).toHaveBeenCalledTimes(2)
    expect(h.fake!._all('deals')[0].follow_up_notified_at).toBe(NEW_FOLLOW_UP_AT)
  })
})
