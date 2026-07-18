/**
 * GET /api/cron/late-check-in — both LATE CHECK-IN and LATE CHECK-OUT
 * branches deduped via a pre-send `select` on `notifications`
 * (tenant_id, booking_id, type), with no constraint backing that check, and
 * fired the team+admin SMS (fire-and-forget) BEFORE inserting the
 * notifications row that was supposed to be the dedup record. Two
 * overlapping invocations (this cron loops every active tenant with no
 * run-lock, same shape as payment-reminder/outreach/post-job-followup)
 * could both read zero existing notifications for the same late booking and
 * both fire SMS. Same bug class as this session's other claim-before-send
 * fixes.
 *
 * Fix: insert the notifications row FIRST -- a partial unique index on
 * (tenant_id, booking_id, type) WHERE type IN
 * ('late_check_in','late_check_out') is the atomic claim -- and only send
 * if that insert succeeds.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: {}, timing: {} })),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/late-check-in', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 2am UTC on the 17th = 10pm EDT on the 16th (same fixture moment as the
// day-boundary test) -- keeps both the ET-instant and ET-day-boundary
// filters satisfied for a booking that started 21:45 ET.
const NOW = new Date('2026-07-17T02:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('concurrent late-check-in invocations racing the same late booking', () => {
  beforeEach(() => {
    h.fake = createFakeSupabase({
      tenants: [{
        id: 'tenant-A', name: 'Acme Cleaning', status: 'active',
        telnyx_api_key: 'key', telnyx_phone: '+15551234567',
        owner_phone: '+15550009999', phone: null,
      }],
      bookings: [{
        id: 'b1', tenant_id: 'tenant-A', status: 'scheduled', check_in_time: null,
        start_time: '2026-07-16T21:45:00', team_member_id: 'tm-1',
        clients: { name: 'Jane Doe', phone: '+15550001111' },
        team_members: { name: 'Cleaner Cathy', phone: '+15559998888' },
      }],
      notifications: [],
    })
    h.fake._addUniqueConstraint('notifications', 'booking_id')
  })

  it('texts the team member and admin exactly once for a late check-in', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.late_check_ins + secondJson.late_check_ins).toBe(1)
    // 2 sends per fired occurrence (team + admin) -- exactly one occurrence.
    expect(sendSMS).toHaveBeenCalledTimes(2)
    expect(
      h.fake!._all('notifications').filter((n) => n.booking_id === 'b1' && n.type === 'late_check_in')
    ).toHaveLength(1)
  })

  it('claims the notifications row BEFORE calling sendSMS, not after', async () => {
    let claimCountAtSendTime = -1
    sendSMS.mockImplementationOnce(async () => {
      claimCountAtSendTime = h.fake!._all('notifications').filter((n) => n.booking_id === 'b1').length
      return { success: true }
    })

    await GET(req())

    expect(claimCountAtSendTime).toBe(1)
  })
})

describe('concurrent late-check-in invocations racing the same late-checkout booking', () => {
  beforeEach(() => {
    h.fake = createFakeSupabase({
      tenants: [{
        id: 'tenant-A', name: 'Acme Cleaning', status: 'active',
        telnyx_api_key: 'key', telnyx_phone: '+15551234567',
        owner_phone: '+15550009999', phone: null,
      }],
      bookings: [{
        id: 'b2', tenant_id: 'tenant-A', status: 'in_progress', check_out_time: null,
        start_time: '2026-07-16T20:00:00', team_member_id: 'tm-1',
        fifteen_min_alert_time: '2026-07-17T01:00:00.000Z',
        clients: { name: 'Jane Doe', phone: '+15550001111' },
        team_members: { name: 'Cleaner Cathy', phone: '+15559998888' },
      }],
      notifications: [],
    })
    h.fake._addUniqueConstraint('notifications', 'booking_id')
  })

  it('texts the team member and admin exactly once for a late check-out', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.late_check_outs + secondJson.late_check_outs).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(2)
    expect(
      h.fake!._all('notifications').filter((n) => n.booking_id === 'b2' && n.type === 'late_check_out')
    ).toHaveLength(1)
  })
})
