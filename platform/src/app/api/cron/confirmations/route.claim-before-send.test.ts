/**
 * GET /api/cron/confirmations — two separate sent-before-claim races, same
 * bug class closed elsewhere this session:
 *
 * TEAM branch: dedup SELECTed the most recent 'team_confirm_request'
 * notifications row and throttled to 55 min, but that row is only inserted
 * AFTER sendSMS() resolves. Repeating (resend hourly until confirmed), so
 * the fix is a compare-and-swap on team_confirm_request_sent_at (epoch
 * default, `.lt(throttleCutoff)`), same shape as
 * last_payment_followup_sent_at.
 *
 * CLIENT branch: dedup SELECTed for an existing 'client_confirm_request'
 * notifications row, same after-the-send insert. One-shot (no legitimate
 * resend), so the fix is a compare-and-swap on
 * client_confirm_request_sent_at (nullable, `.is(null)`), same shape as
 * confirmation_reminder_sent_at.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: {}, timing: {} })),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/confirmations', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const realTZ = process.env.TZ

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/confirmations — team branch claim-before-send', () => {
  // Any hour outside 13 ET so only the team branch is exercised.
  const NOW = new Date('2026-07-17T15:00:00.000Z') // 11am EDT

  beforeEach(() => {
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    process.env.CRON_SECRET = 'test-cron-secret'
    sendSMS.mockClear()
    h.seq = 0
    h.store = {
      tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }],
      bookings: [{
        id: 'b1', tenant_id: 'tenant-A', status: 'scheduled',
        start_time: '2026-07-17T18:00:00', end_time: '2026-07-17T19:00:00',
        team_member_id: 'tm-1',
        team_confirm_request_sent_at: '1970-01-01T00:00:00+00',
        clients: { name: 'Jane Doe', address: '123 Main St' },
        team_members: { name: 'Sam Cleaner', phone: '+15559998888' },
      }],
      notifications: [],
    }
  })

  it('writes team_confirm_request_sent_at BEFORE calling sendSMS, not after', async () => {
    let sentAtSendTime: unknown = 'not-yet-checked'
    sendSMS.mockImplementationOnce(async () => {
      sentAtSendTime = h.store.bookings.find((b) => b.id === 'b1')!.team_confirm_request_sent_at
      return { success: true }
    })

    await GET(req() as never)

    expect(sentAtSendTime).not.toBe('not-yet-checked')
    expect(sentAtSendTime).not.toBe('1970-01-01T00:00:00+00')
  })

  it('claims team_confirm_request_sent_at before sending, and only sends once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.team_confirm_request_sent_at).not.toBe('1970-01-01T00:00:00+00')
  })

  it('two overlapping invocations racing the same booking only send once', async () => {
    // Real-world precondition: both invocations' SELECTs read the same
    // booking with team_confirm_request_sent_at still outside the throttle
    // window before either's CAS claim lands (this cron loops every active
    // tenant with no run-lock). The losing invocation's claim must affect 0
    // rows since the row no longer matches the `.lt(throttleCutoff)`
    // condition it read.
    const [first, second] = await Promise.all([GET(req() as never), GET(req() as never)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.sent + secondJson.sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not resend a team confirm request within the 55-min throttle', async () => {
    // 10 min ago -- inside the 55-min throttle, still claimed.
    h.store.bookings[0].team_confirm_request_sent_at = '2026-07-17T14:50:00.000Z'

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('does resend a team confirm request once the throttle has expired', async () => {
    // 1h ago -- outside the 55-min throttle, eligible again.
    h.store.bookings[0].team_confirm_request_sent_at = '2026-07-17T14:00:00.000Z'

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not send once the team member has already confirmed', async () => {
    h.store.notifications = [{
      id: 'n1', tenant_id: 'tenant-A', booking_id: 'b1', type: 'team_confirmed',
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(sendSMS).not.toHaveBeenCalled()
  })
})

describe('GET /api/cron/confirmations — admin no-confirm-alert claim-before-insert', () => {
  const NOW = new Date('2026-07-17T15:00:00.000Z') // 11am EDT

  beforeEach(() => {
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    process.env.CRON_SECRET = 'test-cron-secret'
    sendSMS.mockClear()
    h.seq = 0
    h.store = {
      tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }],
      bookings: [{
        id: 'b1', tenant_id: 'tenant-A', status: 'scheduled',
        start_time: '2026-07-17T18:00:00', end_time: '2026-07-17T19:00:00',
        team_member_id: 'tm-1',
        team_confirm_request_sent_at: '1970-01-01T00:00:00+00',
        team_no_confirm_alert_sent_at: '1970-01-01T00:00:00+00',
        clients: { name: 'Jane Doe', address: '123 Main St' },
        team_members: { name: 'Sam Cleaner', phone: '+15559998888' },
      }],
      // 3 prior attempts -- this run is the qualifying 4th, which crosses
      // the >=3 admin-alert threshold.
      notifications: [
        { id: 'n1', tenant_id: 'tenant-A', booking_id: 'b1', type: 'team_confirm_request' },
        { id: 'n2', tenant_id: 'tenant-A', booking_id: 'b1', type: 'team_confirm_request' },
        { id: 'n3', tenant_id: 'tenant-A', booking_id: 'b1', type: 'team_confirm_request' },
      ],
    }
  })

  it('claims team_no_confirm_alert_sent_at before inserting the admin alert', async () => {
    await GET(req() as never)

    expect(h.store.bookings.find((b) => b.id === 'b1')!.team_no_confirm_alert_sent_at).not.toBe('1970-01-01T00:00:00+00')
    expect(h.store.notifications.some((n) => n.type === 'team_no_confirm_alert')).toBe(true)
  })

  it('two overlapping invocations racing the same qualifying booking only alert once', async () => {
    const [first, second] = await Promise.all([GET(req() as never), GET(req() as never)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const alertCount = h.store.notifications.filter((n) => n.type === 'team_no_confirm_alert').length
    expect(alertCount).toBe(1)
  })

  it('does not re-alert within the 24h window', async () => {
    // 1h ago -- inside the 24h window, still claimed.
    h.store.bookings[0].team_no_confirm_alert_sent_at = '2026-07-17T14:00:00.000Z'

    await GET(req() as never)

    expect(h.store.notifications.some((n) => n.type === 'team_no_confirm_alert')).toBe(false)
  })

  it('does re-alert once the 24h window has expired', async () => {
    // 25h ago -- outside the 24h window, eligible again.
    h.store.bookings[0].team_no_confirm_alert_sent_at = '2026-07-16T14:00:00.000Z'

    await GET(req() as never)

    expect(h.store.notifications.some((n) => n.type === 'team_no_confirm_alert')).toBe(true)
  })
})

describe('GET /api/cron/confirmations — client branch claim-before-send', () => {
  // 1pm EDT (17:00 UTC) -- the true ET hour the client day-before branch fires at.
  const NOW = new Date('2026-07-17T17:00:00.000Z')

  beforeEach(() => {
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    process.env.CRON_SECRET = 'test-cron-secret'
    sendSMS.mockClear()
    h.seq = 0
    h.store = {
      tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }],
      bookings: [{
        id: 'b2', tenant_id: 'tenant-A', client_id: 'client-1', status: 'scheduled',
        start_time: '2026-07-18T14:00:00',
        client_confirm_request_sent_at: null,
        clients: { name: 'Jane Doe', phone: '+15559998888', sms_consent: true },
        team_members: null,
      }],
      notifications: [],
    }
  })

  it('writes client_confirm_request_sent_at BEFORE calling sendSMS, not after', async () => {
    let sentAtSendTime: unknown = 'not-yet-checked'
    sendSMS.mockImplementationOnce(async () => {
      sentAtSendTime = h.store.bookings.find((b) => b.id === 'b2')!.client_confirm_request_sent_at
      return { success: true }
    })

    await GET(req() as never)

    expect(sentAtSendTime).not.toBe('not-yet-checked')
    expect(sentAtSendTime).not.toBeNull()
  })

  it('claims client_confirm_request_sent_at before sending, and only sends once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b2')!.client_confirm_request_sent_at).not.toBeNull()
  })

  it('two overlapping invocations racing the same booking only send once', async () => {
    // Real-world precondition: both invocations' SELECTs read the same
    // booking with client_confirm_request_sent_at:null before either's CAS
    // claim lands. This branch is gated to a single ET hour, so this is the
    // highest-fan-out race window in the cron -- the losing invocation's
    // claim must affect 0 rows since the row no longer matches the
    // `.is(null)` condition it read.
    const [first, second] = await Promise.all([GET(req() as never), GET(req() as never)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.sent + secondJson.sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not resend once already claimed by a prior run', async () => {
    h.store.bookings[0].client_confirm_request_sent_at = '2026-07-17T16:30:00.000Z'

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(sendSMS).not.toHaveBeenCalled()
  })
})
