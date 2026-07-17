/**
 * GET /api/cron/payment-reminder — payment_reminder_sent_at used to be
 * written in a SEPARATE update AFTER the client nudge / admin escalation SMS
 * already resolved. If two invocations overlapped (this route loops every
 * active tenant with an unbounded number of bookings each, maxDuration=60 on
 * a cron that fires every 5 min), both could read the same booking's
 * payment_reminder_sent_at as null/stale before either wrote its mark, and
 * both would text the client (or double-fire the admin escalation) for the
 * same booking. Same bug class as rating-prompt's claim-before-send fix.
 *
 * Fix: a compare-and-swap update (conditioned on payment_reminder_sent_at
 * still matching what was just read) BEFORE sending, so the losing side of
 * an overlap affects 0 rows and skips instead of sending a duplicate.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
const sendSMS = vi.fn(async () => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/payment-reminder', () => ({ runNycMaidPaymentReminder: vi.fn() }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({ comms: { payment_reminder: { sms: true } }, timing: {} }),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/payment-reminder', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 20 min after the 15-min alert -- inside the "gentle nudge" window (<30min).
const ALERT_TIME = '2026-07-17T15:40:00.000Z'
const NOW = new Date('2026-07-17T16:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
  h.seq = 0
  h.store = {
    tenants: [{
      id: 'tenant-A', name: 'Tenant A', status: 'active',
      telnyx_api_key: 'key', telnyx_phone: '+15551234567',
      owner_phone: '+15550001111', phone: null,
    }],
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', start_time: '2026-07-17T15:00:00',
      payment_status: 'unpaid', payment_reminder_sent_at: null,
      fifteen_min_alert_time: ALERT_TIME,
      clients: { name: 'Jane Doe', phone: '+15559998888', sms_consent: true },
    }],
  }
})

describe('GET /api/cron/payment-reminder — claim-before-send', () => {
  it('writes payment_reminder_sent_at BEFORE calling sendSMS, not after', async () => {
    let sentAtSendTime: unknown = 'not-yet-checked'
    sendSMS.mockImplementationOnce(async () => {
      sentAtSendTime = h.store.bookings.find((b) => b.id === 'b1')!.payment_reminder_sent_at
      return { success: true }
    })

    await GET(req() as never)

    expect(sentAtSendTime).not.toBe('not-yet-checked')
    expect(sentAtSendTime).not.toBeNull()
  })

  it('claims payment_reminder_sent_at before sending, and only sends once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.reminded).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.payment_reminder_sent_at).not.toBeNull()
  })

  it('two overlapping invocations racing the same booking only send once', async () => {
    // Real-world precondition: both invocations' SELECTs read the same
    // booking with payment_reminder_sent_at:null before either's CAS claim
    // lands (this cron loops every active tenant with no run-lock). The
    // losing invocation's claim must affect 0 rows since the row no longer
    // matches the `.is(null)` condition it read.
    const [first, second] = await Promise.all([GET(req() as never), GET(req() as never)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.reminded + secondJson.reminded).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.payment_reminder_sent_at).not.toBeNull()
  })
})
