/**
 * GET /api/cron/reminders — THREE separate broken dedup mechanisms in one
 * file:
 *
 * 1. DAY-BASED reminders (3-day/1-day-before): the pre-send check queried
 *    `notifications` for `type = 'reminder_Nday'`, but the only write on
 *    that path goes through notify(), which always inserts the fixed enum
 *    literal 'booking_reminder' -- never the dynamic 'reminder_Nday' value.
 *    Check and write never matched, so this dedup was DEAD CODE that always
 *    saw zero existing rows -- not merely a race window, a claim that never
 *    functioned even in a single-threaded run.
 * 2. HOUR-BASED reminders: check and write both used 'reminder_Nhour' (this
 *    one DID match), but the insert happened AFTER firing both the client
 *    and team-member SMS -- the standard sent-before-claim race already
 *    fixed elsewhere this session.
 * 3. PAYMENT_DUE alert: same sent-before-claim race -- the in-app
 *    'payment_due' row was inserted after the admin email went out.
 *
 * Fix: all three now insert their dedup-claim row FIRST (backed by a new
 * partial unique index) and only send if that insert succeeds.
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
const notify = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (args: unknown) => notify(args) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))

const getCommPrefs = vi.fn(async (_tenantId: string) => ({ comms: {}, timing: { reminder_days: [] as number[], reminder_hours_before: [] as number[] } }))
vi.mock('@/lib/comms-prefs', () => ({ getCommPrefs: (tenantId: string) => getCommPrefs(tenantId) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/reminders', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
  notify.mockClear()
  getCommPrefs.mockClear()
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('day-based reminder claim (previously dead dedup)', () => {
  beforeEach(() => {
    getCommPrefs.mockResolvedValue({ comms: {}, timing: { reminder_days: [1], reminder_hours_before: [] } })
    // 8am EDT (12:00 UTC) -- true ET hour the day-based block gates on.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'))

    h.fake = createFakeSupabase({
      tenants: [{
        id: 'tenant-A', name: 'Acme Cleaning', status: 'active',
        telnyx_api_key: 'key', telnyx_phone: '+15551234567', resend_api_key: 'key',
        slug: 'acme', industry: 'other',
      }],
      bookings: [{
        id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', team_member_id: 'tm-1',
        status: 'scheduled', service_type: 'Cleaning',
        start_time: '2026-07-18T14:00:00', end_time: '2026-07-18T16:00:00',
        clients: { name: 'Jane Doe', phone: '+15550001111', email: 'jane@example.com', sms_consent: true },
        team_members: { name: 'Cleaner Cathy', phone: '+15559998888', email: 'cathy@example.com' },
      }],
      notifications: [],
    })
    h.fake._addUniqueConstraint('notifications', 'booking_id')
  })

  it('sends the day-before email+SMS exactly once across two overlapping invocations', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    await Promise.all([first.json(), second.json()])

    expect(sendSMS).toHaveBeenCalledTimes(1)
    // 2 notify() calls per occurrence: client email reminder + team member
    // "Job Tomorrow" message -- exactly one occurrence should land.
    expect(notify).toHaveBeenCalledTimes(2)
    expect(
      h.fake!._all('notifications').filter((n) => n.booking_id === 'b1' && n.type === 'reminder_1day')
    ).toHaveLength(1)
  })

  it('a second, non-concurrent invocation in the same 8am hour does not re-send (the dedup actually functions now)', async () => {
    await GET(req())
    await GET(req())

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledTimes(2)
  })

  it('claims the notifications row BEFORE calling notify(), not after', async () => {
    let claimCountAtSendTime = -1
    notify.mockImplementationOnce(async () => {
      claimCountAtSendTime = h.fake!._all('notifications').filter((n) => n.booking_id === 'b1').length
      return { success: true }
    })

    await GET(req())

    expect(claimCountAtSendTime).toBe(1)
  })
})

describe('hour-based reminder claim (send-before-claim race)', () => {
  beforeEach(() => {
    getCommPrefs.mockResolvedValue({ comms: {}, timing: { reminder_days: [], reminder_hours_before: [2] } })
    // 3am EDT (07:00 UTC) -- avoids every other hour-gated branch in this
    // file (day-based=8, pending-alerts=8/14, ops-recap=20, digest=21) so
    // only the hour-based reminder fires.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T07:00:00.000Z'))
    const now = new Date()
    now.setMinutes(0, 0, 0)
    const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString()

    h.fake = createFakeSupabase({
      tenants: [{
        id: 'tenant-A', name: 'Acme Cleaning', status: 'active',
        telnyx_api_key: 'key', telnyx_phone: '+15551234567',
      }],
      bookings: [{
        id: 'b2', tenant_id: 'tenant-A', client_id: 'client-1', team_member_id: 'tm-1',
        status: 'confirmed', start_time: startTime,
        clients: { name: 'Jane Doe', phone: '+15550001111', email: 'jane@example.com', sms_consent: true },
        team_members: { name: 'Cleaner Cathy', phone: '+15559998888' },
      }],
      notifications: [],
    })
    h.fake._addUniqueConstraint('notifications', 'booking_id')
  })

  it('texts client and team member exactly once across two overlapping invocations', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    await Promise.all([first.json(), second.json()])

    // 2 sends per occurrence (client + team) -- exactly one occurrence should land.
    expect(sendSMS).toHaveBeenCalledTimes(2)
    expect(
      h.fake!._all('notifications').filter((n) => n.booking_id === 'b2' && n.type === 'reminder_2hour')
    ).toHaveLength(1)
  })
})

describe('payment_due claim (send-before-claim race)', () => {
  beforeEach(() => {
    getCommPrefs.mockResolvedValue({ comms: {}, timing: { reminder_days: [], reminder_hours_before: [] } })
    // Same hour-gate avoidance as the hour-based describe above.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T07:00:00.000Z'))
    const now = new Date()
    const endTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
    const startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

    h.fake = createFakeSupabase({
      tenants: [{
        id: 'tenant-A', name: 'Acme Cleaning', status: 'active',
        telnyx_api_key: 'key', telnyx_phone: '+15551234567',
      }],
      bookings: [{
        id: 'b3', tenant_id: 'tenant-A', client_id: 'client-1',
        status: 'in_progress', start_time: startTime, end_time: endTime, hourly_rate: 75,
        clients: { name: 'Jane Doe' },
        team_members: { name: 'Cleaner Cathy' },
      }],
      notifications: [],
    })
    h.fake._addUniqueConstraint('notifications', 'booking_id')
  })

  it('emails the admin exactly once across two overlapping invocations', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    await Promise.all([first.json(), second.json()])

    expect(notify).toHaveBeenCalledTimes(1)
    expect(
      h.fake!._all('notifications').filter((n) => n.booking_id === 'b3' && n.type === 'payment_due')
    ).toHaveLength(1)
  })
})
