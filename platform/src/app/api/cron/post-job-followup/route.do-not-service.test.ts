import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * GET /api/cron/post-job-followup texted the client review-request SMS
 * directly with no sms_consent or do_not_service check -- the same class
 * fixed for the booking-lifecycle SMS pipeline this session (89c2cdd9/
 * 14fa0888). A client who'd replied STOP, or one flagged do_not_service,
 * still got the "how did everything go?" review-request text.
 */

process.env.CRON_SECRET = 'test-secret'

const { TENANT_ID } = vi.hoisted(() => ({ TENANT_ID: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    tenants: [
      {
        id: TENANT_ID,
        name: 'Acme',
        status: 'active',
        telnyx_api_key: 'key',
        telnyx_phone: '+15551234567',
        domain: null,
        slug: 'acme',
      },
    ],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

const smsSends: string[] = []
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async ({ to }: { to: string }) => {
    smsSends.push(to)
  }),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    chatbot_enabled: true,
    review_followup_enabled: true,
    review_followup_delay_hours: 2,
    google_review_link: 'https://g.page/acme/review',
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

function seedBookings() {
  const checkedOutAt = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
  fake._seed('bookings', [
    {
      id: 'booking-dns',
      tenant_id: TENANT_ID,
      client_id: 'client-dns',
      job_id: null,
      status: 'completed',
      notes: null,
      check_out_time: checkedOutAt,
      clients: { name: 'Dana', phone: '+15559990001', sms_consent: true, do_not_service: true },
    },
    {
      id: 'booking-optout',
      tenant_id: TENANT_ID,
      client_id: 'client-optout',
      job_id: null,
      status: 'completed',
      notes: null,
      check_out_time: checkedOutAt,
      clients: { name: 'Oscar', phone: '+15559990002', sms_consent: false, do_not_service: false },
    },
    {
      id: 'booking-ok',
      tenant_id: TENANT_ID,
      client_id: 'client-ok',
      job_id: null,
      status: 'completed',
      notes: null,
      check_out_time: checkedOutAt,
      clients: { name: 'Olivia', phone: '+15559990003', sms_consent: true, do_not_service: false },
    },
  ])
}

describe('GET /api/cron/post-job-followup — do_not_service / sms_consent gate', () => {
  beforeEach(() => {
    smsSends.length = 0
  })

  it('does not text a client flagged do_not_service or opted out of sms_consent, but still texts an eligible client', async () => {
    seedBookings()
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(smsSends).not.toContain('+15559990001')
    expect(smsSends).not.toContain('+15559990002')
    expect(smsSends).toContain('+15559990003')
  })
})
