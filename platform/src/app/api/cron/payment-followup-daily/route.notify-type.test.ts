import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Fresh-ground finding: the cap-reached admin notify() call borrowed
 * `type: 'follow_up'` with no explicit `channel`, so it fell to notify()'s
 * default of 'email'. Unlike `check_in` (no template case), `follow_up`
 * DOES have a switch case in notify.ts — `followUpEmail()`, the CLIENT-facing
 * post-service win-back template ("Thank You! Hi Client, thank you for
 * choosing ${tenant}! ... Your Discount Code THANKYOU — 10% off your next
 * appointment"). Every time this cron's per-tenant send cap (100/run) was
 * exceeded, the tenant owner got that marketing template — subject
 * "Payment follow-up cap reached (100)", body a nonsensical discount-code
 * email with an empty service name and generic "Client" greeting — instead
 * of the actual ops-alert message. `type: 'payment_followup_cap'` (new
 * dedicated NotificationType, no template case) stops the collision; it
 * falls through to notify()'s generic plain-paragraph fallback, which
 * renders the real title/message this call always intended to send.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))

const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (_arg: { type: string; title: string; message: string }) => ({ success: true })),
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-payment-followup-cap'
const fake = supabaseAdmin as unknown as FakeSupabase

function seed(bookingCount: number) {
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
    },
  ])
  fake._seed(
    'bookings',
    Array.from({ length: bookingCount }, (_, i) => ({
      id: `bk-${i}`,
      tenant_id: TENANT_ID,
      client_id: `client-${i}`,
      status: 'completed',
      price: 15000,
      end_time: '2026-07-10T14:00:00',
      payment_status: 'unpaid',
      payment_method: null,
      clients: { name: `Client ${i}`, phone: `+1555000${String(i).padStart(4, '0')}`, sms_consent: true },
    })),
  )
  fake._seed('sms_logs', [])
}

function req() {
  return new Request('http://x/api/cron/payment-followup-daily?force=1', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

describe('cron/payment-followup-daily — cap-reached notify() type', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  it('uses the dedicated payment_followup_cap type, not the borrowed follow_up', async () => {
    seed(101) // over MAX_SENDS_PER_RUN (100)
    const res = await GET(req())
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'payment_followup_cap' }))
    expect(notifyMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'follow_up' }))
  })
})
