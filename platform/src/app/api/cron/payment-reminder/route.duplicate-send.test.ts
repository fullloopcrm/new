/**
 * GET /api/cron/payment-reminder read `payment_reminder_sent_at` in the
 * initial SELECT, then only stamped it AFTER sending the SMS/escalation at
 * the bottom of the loop. This cron runs every 5 min — a slow run (or a
 * manual re-trigger overlapping a scheduled tick) could see the same stale
 * timestamp on two overlapping invocations and both send before either wrote
 * the claim, double-texting the client (or double-escalating to the owner).
 * Fixed by claiming the booking with a conditional UPDATE (IS NULL, then <
 * cutoff) before deciding what to send — only the run whose UPDATE actually
 * matches a row proceeds.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

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

function seedPendingBooking() {
  // 20 min since alert -> nudge branch (< 30 min), never reminded before.
  const alertTime = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  fake._seed('bookings', [
    {
      id: 'booking-1',
      tenant_id: TENANT_ID,
      client_id: 'client-1',
      start_time: '2026-08-01T09:00:00Z',
      payment_status: 'pending',
      fifteen_min_alert_time: alertTime,
      payment_reminder_sent_at: null,
      clients: { name: 'Jane Doe', phone: '+15559998888' },
    },
  ])
}

describe('GET /api/cron/payment-reminder — duplicate-send guard', () => {
  beforeEach(() => {
    smsSends.length = 0
  })

  it('sends once for a normal single run', async () => {
    seedPendingBooking()
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.reminded).toBe(1)
    expect(smsSends).toEqual(['+15559998888'])
    expect(fake._all('bookings')[0].payment_reminder_sent_at).not.toBeNull()
  })

  it('does not double-send when two overlapping cron invocations race the same booking', async () => {
    seedPendingBooking()

    const [resA, resB] = await Promise.all([GET(req()), GET(req())])
    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])

    expect(jsonA.reminded + jsonB.reminded).toBe(1)
    expect(smsSends).toEqual(['+15559998888'])
    expect(fake._all('bookings')[0].payment_reminder_sent_at).not.toBeNull()
  })

  it('does not re-send within the 5-min throttle window on a subsequent run', async () => {
    seedPendingBooking()
    await GET(req())
    smsSends.length = 0

    const res = await GET(req())
    const json = await res.json()
    expect(json.reminded).toBe(0)
    expect(smsSends).toEqual([])
  })
})
