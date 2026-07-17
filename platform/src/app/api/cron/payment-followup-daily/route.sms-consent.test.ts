/**
 * GET /api/cron/payment-followup-daily — this route called the raw
 * sendSMS() from '@/lib/sms' (a wire-level Telnyx wrapper with no consent
 * logic of its own) directly, with no sms_consent check anywhere in the
 * route. webhooks/telnyx's STOP handler sets clients.sms_consent=false
 * tenant-wide on request (a legally-required blanket opt-out, confirmed via
 * TCPA reply) -- but this cron ignored it entirely, so an opted-out client
 * with an unpaid completed booking kept getting texted asking for money
 * every send slot until paid. Same consent-bypass bug class as this
 * session's telnyx-voice missed-call-callback fix.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

let bookingsData: Array<Record<string, unknown>> = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        gte: () => chain,
        not: () => chain,
        is: () => chain,
        insert: async () => ({ data: null, error: null }),
        then: (resolve: (v: { data: unknown[]; error: null; count?: number }) => void) => {
          if (table === 'tenants') {
            return resolve({
              data: [{
                id: 'tenant-A', name: 'Tenant A',
                telnyx_api_key: 'key', telnyx_phone: '+15551234567',
                payment_link: 'https://pay.example/tenant-a', owner_phone: null, phone: null,
              }],
              error: null,
            })
          }
          if (table === 'bookings') return resolve({ data: bookingsData, error: null })
          if (table === 'sms_logs') return resolve({ data: [], error: null, count: 0 })
          return resolve({ data: [], error: null })
        },
      }
      return chain
    },
  },
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/payment-followup-daily', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 12pm EDT -- inside a send slot, no dry/force needed.
const NOW = new Date('2026-07-17T16:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
  bookingsData = []
})

describe('GET /api/cron/payment-followup-daily — sms_consent gate', () => {
  it('does NOT text a client who opted out (sms_consent:false)', async () => {
    bookingsData = [{
      id: 'b1', client_id: 'client-1', price: 15000, end_time: '2026-07-10T12:00:00',
      clients: { name: 'Opted Out Client', phone: '+15559998888', sms_consent: false },
    }]
    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).not.toHaveBeenCalled()
    expect(json.tenants[0].sent).toBe(0)
  })

  it('still texts a client with no explicit opt-out (sms_consent:true or unset)', async () => {
    bookingsData = [{
      id: 'b2', client_id: 'client-2', price: 20000, end_time: '2026-07-10T12:00:00',
      clients: { name: 'Consenting Client', phone: '+15551112222', sms_consent: true },
    }]
    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(json.tenants[0].sent).toBe(1)
  })
})
