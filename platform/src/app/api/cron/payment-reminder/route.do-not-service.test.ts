import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * GET /api/cron/payment-reminder's generic (non-nycmaid) branch texted the
 * client directly with no sms_consent or do_not_service check -- the same
 * class fixed for the booking-lifecycle SMS pipeline this session
 * (89c2cdd9/14fa0888). A client who'd replied STOP, or one flagged
 * do_not_service, still got the +15/+30-min payment nudge.
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
        owner_phone: '+15550001111',
        phone: null,
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

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({ comms: {} }),
}))

vi.mock('@/lib/nycmaid/tenant', () => ({
  isNycMaid: () => false,
}))

vi.mock('@/lib/nycmaid/payment-reminder', () => ({
  runNycMaidPaymentReminder: async () => ({ nudges: 0, flagged: 0 }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

function seedPendingBooking(id: string, clientOverrides: Record<string, unknown>) {
  const alertTime = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  fake._seed('bookings', [
    {
      id,
      tenant_id: TENANT_ID,
      client_id: `client-${id}`,
      start_time: '2026-08-01T09:00:00Z',
      payment_status: 'pending',
      fifteen_min_alert_time: alertTime,
      payment_reminder_sent_at: null,
      clients: { name: 'Jane Doe', phone: '+15559998888', sms_consent: true, do_not_service: false, ...clientOverrides },
    },
  ])
}

describe('GET /api/cron/payment-reminder — do_not_service / sms_consent gate', () => {
  beforeEach(() => {
    smsSends.length = 0
  })

  it('does not text a client flagged do_not_service', async () => {
    seedPendingBooking('booking-dns', { do_not_service: true })
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.reminded).toBe(0)
    expect(smsSends).toEqual([])
  })

  it('does not text a client who opted out of sms_consent', async () => {
    seedPendingBooking('booking-optout', { sms_consent: false })
    const res = await GET(req())
    const json = await res.json()
    expect(json.reminded).toBe(0)
    expect(smsSends).toEqual([])
  })

  it('still texts an eligible client', async () => {
    seedPendingBooking('booking-ok', {})
    const res = await GET(req())
    const json = await res.json()
    expect(json.reminded).toBe(1)
    expect(smsSends).toEqual(['+15559998888'])
  })
})
