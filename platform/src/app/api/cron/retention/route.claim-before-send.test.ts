/**
 * GET /api/cron/retention — the old dedup was two separate notifications-
 * table SELECTs (a lifetime-cap COUNT(*) and a 30-day-cooldown SELECT), but
 * the only notifications row that would satisfy either check is inserted
 * AFTER sendSMS() resolves. Check and write never raced against each other
 * correctly: two overlapping invocations (this cron runs daily with no
 * run-lock over up to 500 clients per tenant) could both read zero matching
 * rows for the same client before either write landed, and both text the
 * client. Same bug class as phone-fixup/confirmation-reminder's
 * claim-before-send fix.
 *
 * Fix: a single compare-and-swap UPDATE on clients.retention_sms_sent_at +
 * retention_sms_count (both conditions in one WHERE clause) BEFORE sending,
 * so the losing side of an overlap affects 0 rows and skips instead of
 * sending a duplicate. Claim is released back to its exact pre-claim state
 * on send failure, so a transient error doesn't burn a lifetime-cap slot or
 * block the cooldown.
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

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/retention', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const NOW = new Date('2026-07-17T14:00:00.000Z')
// 60 days ago -- inside the 30-90-day lapsed window.
const LAST_BOOKING_END = '2026-05-18T12:00:00'

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
    }],
    clients: [{
      id: 'client-1', tenant_id: 'tenant-A', name: 'Jane Doe', phone: '+15559998888',
      active: true, sms_consent: true,
      retention_sms_sent_at: '1970-01-01T00:00:00+00', retention_sms_count: 0,
    }],
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1',
      status: 'completed', end_time: LAST_BOOKING_END, start_time: '2099-01-01T00:00:00',
    }],
    notifications: [],
  }
})

describe('GET /api/cron/retention — claim-before-send', () => {
  it('writes retention_sms_sent_at BEFORE calling sendSMS, not after', async () => {
    let sentAtSendTime: unknown = 'not-yet-checked'
    sendSMS.mockImplementationOnce(async () => {
      sentAtSendTime = h.store.clients.find((c) => c.id === 'client-1')!.retention_sms_sent_at
      return { success: true }
    })

    await GET(req() as never)

    expect(sentAtSendTime).not.toBe('not-yet-checked')
    expect(sentAtSendTime).not.toBe('1970-01-01T00:00:00+00')
  })

  it('claims retention_sms_sent_at + increments retention_sms_count before sending, and only sends once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    const client = h.store.clients.find((c) => c.id === 'client-1')!
    expect(client.retention_sms_sent_at).not.toBe('1970-01-01T00:00:00+00')
    expect(client.retention_sms_count).toBe(1)
  })

  it('two overlapping invocations racing the same client only send once', async () => {
    // Real-world precondition: both invocations' SELECTs read the same
    // client with retention_sms_sent_at outside the 30-day cooldown before
    // either's CAS claim lands (this cron loops every active tenant with no
    // run-lock). The losing invocation's claim must affect 0 rows since the
    // row no longer matches the `.lt(thirtyDaysAgo)` condition it read.
    const [first, second] = await Promise.all([GET(req() as never), GET(req() as never)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.sent + secondJson.sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(h.store.clients.find((c) => c.id === 'client-1')!.retention_sms_count).toBe(1)
  })

  it('does not re-text a client still inside the 30-day cooldown', async () => {
    h.store.clients[0].retention_sms_sent_at = '2026-07-01T14:00:00.000Z' // 16 days ago

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('re-texts a client whose cooldown has aged out', async () => {
    h.store.clients[0].retention_sms_sent_at = '2026-06-01T14:00:00.000Z' // >30 days ago

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('never sends once the lifetime cap of 3 is reached, even with an expired cooldown', async () => {
    h.store.clients[0].retention_sms_sent_at = '2026-06-01T14:00:00.000Z' // >30 days ago
    h.store.clients[0].retention_sms_count = 3

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('releases the claim back to its exact pre-claim state when sendSMS throws', async () => {
    sendSMS.mockRejectedValueOnce(new Error('carrier down'))

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(json.errors[0]).toContain('carrier down')
    const client = h.store.clients.find((c) => c.id === 'client-1')!
    expect(client.retention_sms_sent_at).toBe('1970-01-01T00:00:00+00')
    expect(client.retention_sms_count).toBe(0)
  })
})
