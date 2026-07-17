import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (116): this cron's client-facing payment nudge had zero comms-registry
 * gating -- unlike its sibling `cron/payment-reminder`, which already checks
 * `payPrefs.comms.payment_reminder?.sms !== false` before texting a client.
 * comms-registry.ts's own `payment_reminder` entry lists BOTH crons under
 * `firedBy`, so a tenant disabling "Payment reminder" SMS in their
 * Communications settings had zero effect on this send path -- the toggle
 * silently didn't do what its own label promised for the only tenant this
 * cron runs for today (nycmaid, the one tenant with a `payment_link` set).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const { sendSMSMock } = vi.hoisted(() => ({
  sendSMSMock: vi.fn(async () => ({})),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-payment-followup-gate'
const fake = supabaseAdmin as unknown as FakeSupabase

function seed(notificationPreferences?: unknown) {
  fake._store.clear()
  vi.clearAllMocks()
  fake._seed('tenants', [
    {
      id: TENANT_ID,
      name: 'Acme Cleaning',
      status: 'active',
      telnyx_api_key: 'key',
      telnyx_phone: '+15550000000',
      payment_link: 'https://pay.example.com/acme',
      notification_preferences: notificationPreferences ?? null,
    },
  ])
  fake._seed('bookings', [
    {
      id: 'bk-1',
      tenant_id: TENANT_ID,
      client_id: 'client-1',
      status: 'completed',
      price: 15000,
      end_time: '2026-07-10T14:00:00',
      payment_status: 'unpaid',
      payment_method: null,
      clients: { name: 'Jane Doe', phone: '+15551234567', sms_consent: true },
    },
  ])
  fake._seed('sms_logs', [])
}

function req() {
  return new Request('http://x/api/cron/payment-followup-daily?force=1', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

describe('cron/payment-followup-daily — payment_reminder comm gate', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  it('sends the client nudge when no preference is stored (fail-open default)', async () => {
    seed()
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
  })

  it('skips the client nudge when the tenant has turned off payment_reminder SMS', async () => {
    seed({ comms: { payment_reminder: { sms: false } } })
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })
})
