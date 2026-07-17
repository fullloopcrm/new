import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (98): finance/ar-aging and finance/reconcile-candidates already
 * exclude 'refunded' alongside 'paid' from their own "still owes money"
 * queries (both do `.not('payment_status', 'in', '(paid,refunded)')`) —
 * this cron only ever excluded paid/partial. A booking an admin or Selena's
 * approve_refund/process_refund tools had flagged refund_pending/refunded
 * (neither of which sets bookings.payment_method, since the tools only
 * touch payment_status/notes) still matched this cron's `payment_method IS
 * NULL` guard and got "your balance is still open, pay here" SMS + a live
 * Stripe payment link — the opposite of what a refund status means. Proves:
 * refunded/refund_pending bookings are now skipped like paid/partial
 * already were, while a genuinely still-unpaid booking is unaffected.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const smsCalls: Array<{ to: string }> = []
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async (args: { to: string }) => { smsCalls.push({ to: args.to }); return {} }),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-payment-followup'
const fake = supabaseAdmin as unknown as FakeSupabase

function seed(paymentStatus: string) {
  fake._store.clear()
  smsCalls.length = 0
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
  fake._seed('bookings', [
    {
      id: 'bk-1',
      tenant_id: TENANT_ID,
      client_id: 'client-1',
      status: 'completed',
      price: 15000,
      end_time: '2026-07-10T14:00:00',
      payment_status: paymentStatus,
      payment_method: null,
      clients: { name: 'Alice', phone: '+15551234567', sms_consent: true },
    },
  ])
  fake._seed('sms_logs', [])
}

function req() {
  return new Request('http://x/api/cron/payment-followup-daily?force=1', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

describe('cron/payment-followup-daily — refunded bookings are excluded (item 98)', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  it('does NOT text a booking whose payment_status is "refunded"', async () => {
    seed('refunded')
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(smsCalls).toHaveLength(0)
  })

  it('does NOT text a booking whose payment_status is "refund_pending"', async () => {
    seed('refund_pending')
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(smsCalls).toHaveLength(0)
  })

  it('control: DOES text a genuinely still-unpaid booking', async () => {
    seed('unpaid')
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(smsCalls).toHaveLength(1)
    expect(smsCalls[0].to).toBe('+15551234567')
  })
})
