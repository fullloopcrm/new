/**
 * POST /api/reviews/request — the SMS branch called the raw sendSMS() from
 * '@/lib/sms' with no sms_consent check at all, same consent-bypass bug
 * class as payment-followup-daily/payment-reminder/post-job-followup.
 * webhooks/telnyx's STOP handler sets clients.sms_consent=false tenant-wide
 * (a legally-required blanket opt-out) -- this route ignored it entirely
 * (didn't even select the column), so an opted-out client still got a
 * review-request text every time an admin clicked "Request review."
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: {
      tenantId: 'tenant-A',
      tenant: { google_place_id: null, name: 'Tenant A', resend_api_key: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000' },
    },
    error: null,
  }),
}))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))
const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const CLIENT_OPTED_OUT = '11111111-1111-1111-1111-111111111111'
const CLIENT_CONSENTING = '22222222-2222-2222-2222-222222222222'

beforeEach(() => {
  sendSMS.mockClear()
  h.seq = 0
  h.store = {
    clients: [
      { id: CLIENT_OPTED_OUT, tenant_id: 'tenant-A', name: 'Opted Out Client', email: null, phone: '+15559998888', sms_consent: false },
      { id: CLIENT_CONSENTING, tenant_id: 'tenant-A', name: 'Consenting Client', email: null, phone: '+15551112222', sms_consent: true },
    ],
    bookings: [],
    reviews: [],
  }
})

describe('POST /api/reviews/request — sms_consent gate', () => {
  it('does NOT text a client who opted out (sms_consent:false)', async () => {
    const res = await POST(postReq({ client_id: CLIENT_OPTED_OUT }))
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('still texts a client with no explicit opt-out (sms_consent:true)', async () => {
    const res = await POST(postReq({ client_id: CLIENT_CONSENTING }))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
