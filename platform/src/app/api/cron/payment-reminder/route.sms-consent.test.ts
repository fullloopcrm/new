/**
 * GET /api/cron/payment-reminder — the client-facing 15-30min payment nudge
 * called the raw sendSMS() from '@/lib/sms' with no sms_consent check, same
 * consent-bypass bug class as payment-followup-daily's fixed sms_consent
 * gate. webhooks/telnyx's STOP handler sets clients.sms_consent=false
 * tenant-wide (a legally-required blanket opt-out) -- this route ignored it,
 * so an opted-out client with an unpaid booking still got texted asking for
 * money 15-30 minutes after the 15-min alert fired.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/payment-reminder', () => ({ runNycMaidPaymentReminder: vi.fn() }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({ comms: { payment_reminder: { sms: true } }, timing: {} }),
}))

let bookingsData: Array<Record<string, unknown>> = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        not: () => chain,
        lte: () => chain,
        gte: () => chain,
        lt: () => chain,
        is: () => chain,
        limit: () => chain,
        update: () => chain,
        insert: async () => ({ data: null, error: null }),
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => {
          if (table === 'tenants') {
            return resolve({
              data: [{
                id: 'tenant-A', name: 'Tenant A', status: 'active',
                telnyx_api_key: 'key', telnyx_phone: '+15551234567',
                owner_phone: '+15550001111', phone: null,
              }],
              error: null,
            })
          }
          if (table === 'bookings') return resolve({ data: bookingsData, error: null })
          return resolve({ data: [], error: null })
        },
      }
      return chain
    },
  },
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
  bookingsData = []
})

describe('GET /api/cron/payment-reminder — sms_consent gate', () => {
  it('does NOT text a client who opted out (sms_consent:false)', async () => {
    bookingsData = [{
      id: 'b1', start_time: '2026-07-17T15:00:00', payment_reminder_sent_at: null,
      fifteen_min_alert_time: ALERT_TIME,
      clients: { name: 'Opted Out Client', phone: '+15559998888', sms_consent: false },
    }]
    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).not.toHaveBeenCalled()
    expect(json.reminded).toBe(0)
  })

  it('still texts a client with no explicit opt-out (sms_consent:true or unset)', async () => {
    bookingsData = [{
      id: 'b2', start_time: '2026-07-17T15:00:00', payment_reminder_sent_at: null,
      fifteen_min_alert_time: ALERT_TIME,
      clients: { name: 'Consenting Client', phone: '+15551112222', sms_consent: true },
    }]
    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(json.reminded).toBe(1)
  })
})
