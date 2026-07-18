/**
 * GET /api/cron/payment-followup-daily — the old per-slot idempotency check
 * queried sms_logs for sms_type='payment_followup_daily' within the current
 * slot window, but that row was only inserted AFTER sendSMS() resolved.
 * Check and write never raced correctly: two overlapping invocations in the
 * same send slot (a Vercel cron retry/duplicate trigger, an already-observed
 * risk class) could both read zero matching sms_logs rows before either
 * write landed, and both text the client asking for money. Same bug class as
 * rating-prompt/payment-reminder/confirmation-reminder's claim-before-send
 * fix.
 *
 * Fix: a compare-and-swap update on last_payment_followup_sent_at
 * (conditioned on it being older than the current slot's idempotency
 * cutoff) BEFORE sending, so the losing side of an overlap affects 0 rows
 * and skips instead of sending a duplicate.
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
const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

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
  h.seq = 0
  h.store = {
    tenants: [{
      id: 'tenant-A', name: 'Tenant A', status: 'active',
      telnyx_api_key: 'key', telnyx_phone: '+15551234567',
      payment_link: 'https://pay.example/tenant-a', owner_phone: null, phone: null,
    }],
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', price: 15000,
      end_time: '2026-07-10T12:00:00', status: 'completed', payment_status: null,
      payment_method: null, last_payment_followup_sent_at: '1970-01-01T00:00:00+00',
      clients: { name: 'Jane Doe', phone: '+15559998888', sms_consent: true },
    }],
    sms_logs: [],
  }
})

describe('GET /api/cron/payment-followup-daily — claim-before-send', () => {
  it('writes last_payment_followup_sent_at BEFORE calling sendSMS, not after', async () => {
    let sentAtSendTime: unknown = 'not-yet-checked'
    sendSMS.mockImplementationOnce(async () => {
      sentAtSendTime = h.store.bookings.find((b) => b.id === 'b1')!.last_payment_followup_sent_at
      return { success: true }
    })

    await GET(req() as never)

    expect(sentAtSendTime).not.toBe('not-yet-checked')
    expect(sentAtSendTime).not.toBe('1970-01-01T00:00:00+00')
  })

  it('claims last_payment_followup_sent_at before sending, and only sends once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.tenants[0].sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.last_payment_followup_sent_at).not.toBe('1970-01-01T00:00:00+00')
  })

  it('two overlapping invocations racing the same booking only send once', async () => {
    // Real-world precondition: both invocations' SELECTs read the same
    // booking with last_payment_followup_sent_at still outside the current
    // slot before either's CAS claim lands (this cron loops every active
    // tenant with no run-lock). The losing invocation's claim must affect 0
    // rows since the row no longer matches the `.lt(idempotencyCutoff)`
    // condition it read.
    const [first, second] = await Promise.all([GET(req() as never), GET(req() as never)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.tenants[0].sent + secondJson.tenants[0].sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not re-chase a booking already texted earlier in the current slot', async () => {
    // 30 min ago -- inside SLOT_IDEMPOTENCY_MS (3.5h), so still claimed.
    h.store.bookings[0].last_payment_followup_sent_at = '2026-07-17T15:30:00.000Z'

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.tenants[0].sent).toBe(0)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('does re-chase a booking texted in an earlier, now-expired slot', async () => {
    // ~4h ago -- outside SLOT_IDEMPOTENCY_MS (3.5h), eligible again.
    h.store.bookings[0].last_payment_followup_sent_at = '2026-07-17T12:00:00.000Z'

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.tenants[0].sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
