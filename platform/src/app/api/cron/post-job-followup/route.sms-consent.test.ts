/**
 * GET /api/cron/post-job-followup — both the standalone-booking and
 * multi-session-job review-request SMS branches called the raw sendSMS()
 * from '@/lib/sms' with no sms_consent check, same consent-bypass bug class
 * as payment-followup-daily/payment-reminder/reviews-request. webhooks/
 * telnyx's STOP handler sets clients.sms_consent=false tenant-wide (a
 * legally-required blanket opt-out) -- both branches ignored it, so an
 * opted-out client still got a "How did everything go?... Reply STOP to opt
 * out" text 2 hours after every checkout/job completion.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    chatbot_enabled: true,
    review_followup_enabled: true,
    review_followup_delay_hours: 2,
    google_review_link: 'https://g.page/r/test/review',
  }),
}))

let bookingsData: Array<Record<string, unknown>> = []
let jobsData: Array<Record<string, unknown>> = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        gte: () => chain,
        lte: () => chain,
        limit: () => chain,
        update: () => chain,
        insert: async () => ({ data: null, error: null }),
        then: (resolve: (v: { data: unknown[]; error: null; count?: number }) => void) => {
          if (table === 'tenants') {
            return resolve({
              data: [{
                id: 'tenant-A', name: 'Tenant A', status: 'active',
                telnyx_api_key: 'key', telnyx_phone: '+15551234567',
                domain: null, slug: 'tenant-a',
              }],
              error: null,
            })
          }
          if (table === 'bookings') return resolve({ data: bookingsData, error: null })
          if (table === 'jobs') return resolve({ data: jobsData, error: null })
          if (table === 'job_events') return resolve({ data: [], error: null, count: 0 })
          return resolve({ data: [], error: null })
        },
      }
      return chain
    },
  },
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/post-job-followup', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 2.5 hours ago -- inside the "2 hours after checkout" delay window.
const NOW = new Date('2026-07-17T18:00:00.000Z')
const CHECKOUT = '2026-07-17T15:30:00.000Z'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
  bookingsData = []
  jobsData = []
})

describe('GET /api/cron/post-job-followup — sms_consent gate', () => {
  it('standalone booking: does NOT text an opted-out client', async () => {
    bookingsData = [{
      id: 'b1', client_id: 'client-1', notes: null, check_out_time: CHECKOUT,
      clients: { name: 'Opted Out Client', phone: '+15559998888', sms_consent: false },
    }]
    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).not.toHaveBeenCalled()
    expect(json.sent).toBe(0)
    expect(json.skipped).toBe(1)
  })

  it('standalone booking: still texts a consenting client', async () => {
    bookingsData = [{
      id: 'b2', client_id: 'client-2', notes: null, check_out_time: CHECKOUT,
      clients: { name: 'Consenting Client', phone: '+15551112222', sms_consent: true },
    }]
    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(json.sent).toBe(1)
  })

  it('multi-session job: does NOT text an opted-out client', async () => {
    jobsData = [{
      id: 'j1', client_id: 'client-3', completed_at: CHECKOUT,
      clients: { name: 'Opted Out Job Client', phone: '+15553334444', sms_consent: false },
    }]
    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).not.toHaveBeenCalled()
    expect(json.sent).toBe(0)
    expect(json.skipped).toBe(1)
  })

  it('multi-session job: still texts a consenting client', async () => {
    jobsData = [{
      id: 'j2', client_id: 'client-4', completed_at: CHECKOUT,
      clients: { name: 'Consenting Job Client', phone: '+15555556666', sms_consent: true },
    }]
    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(json.sent).toBe(1)
  })
})
