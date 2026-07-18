/**
 * GET /api/cron/follow-up — claim-before-send race.
 *
 * The old notes-substring [THANKYOU_SENT] marker was checked client-side
 * against a row already read this invocation, and written to `notes` AFTER
 * notify() resolved. Two overlapping invocations (a manual re-trigger of
 * this endpoint, or a platform-retried cron delivery) could both read the
 * same not-yet-marked booking and double-send the "thank you + 10% off"
 * email. Fix: a dedicated thank_you_sent_at column, claimed via
 * compare-and-swap (WHERE thank_you_sent_at IS NULL) BEFORE sending. Same
 * bug class + fix shape as post-job-followup's review_followup_sent_at fix
 * this session.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null, notifyCalls: [] as unknown[] }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

const notify = vi.fn(async (args: unknown) => { h.notifyCalls.push(args); return { success: true } })
vi.mock('@/lib/notify', () => ({ notify: (args: unknown) => notify(args) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/follow-up', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const realTZ = process.env.TZ

// 3 days ago, well inside the +/-1hr check_out_time window.
const NOW = new Date('2026-07-17T18:00:00.000Z')
const CHECKOUT = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  h.notifyCalls = []
  notify.mockClear()
  h.fake = createFakeSupabase({
    tenants: [{ id: 'tenant-A', name: 'Tenant A' }],
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', service_type: 'Cleaning',
      status: 'completed', check_out_time: CHECKOUT, notes: null, thank_you_sent_at: null,
      clients: { name: 'Jane Doe' },
    }],
  })
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('concurrent follow-up invocations racing the same booking', () => {
  it('sends the thank-you exactly once', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(notify).toHaveBeenCalledTimes(1)
    expect(firstJson.follow_ups_sent + secondJson.follow_ups_sent).toBe(1)
    expect(h.fake!._all('bookings')[0].thank_you_sent_at).not.toBeNull()
  })

  it('claims thank_you_sent_at BEFORE calling notify, not after', async () => {
    let claimedAtSendTime: unknown = 'not-yet-checked'
    notify.mockImplementationOnce(async (args: unknown) => {
      claimedAtSendTime = h.fake!._all('bookings')[0].thank_you_sent_at
      h.notifyCalls.push(args)
      return { success: true }
    })

    await GET(req())

    expect(claimedAtSendTime).not.toBe('not-yet-checked')
    expect(claimedAtSendTime).not.toBeNull()
  })
})
