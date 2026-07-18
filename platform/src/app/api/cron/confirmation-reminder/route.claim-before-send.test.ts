/**
 * GET /api/cron/confirmation-reminder — the old dedup queried sms_logs for
 * sms_type='confirmation_reminder' (SELECT count, continue-if-any), but that
 * row is only written AFTER sendSMS()'s Telnyx call resolves (lib/nycmaid/
 * sms.ts). Check and write never raced against each other correctly: two
 * overlapping invocations (runs every 5 min, no run-lock) could both read
 * zero matching sms_logs rows before either write landed, and both text the
 * client. Same bug class as rating-prompt/payment-reminder's claim-before-
 * send fix.
 *
 * Fix: a compare-and-swap update on confirmation_reminder_sent_at
 * (conditioned on it still being NULL) BEFORE sending, so the losing side of
 * an overlap affects 0 rows and skips instead of sending a duplicate.
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
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({
    confirmationReminder: () => 'reminder body',
  })),
}))
const sendClientSMS = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: (...args: unknown[]) => sendClientSMS(...args),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/confirmation-reminder', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const NOW = new Date('2026-07-17T18:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  sendClientSMS.mockClear()
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', status: 'active' }],
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', status: 'pending',
      start_time: '2026-07-17T18:00:00', created_at: '2026-07-17T17:00:00.000Z',
      notes: null, confirmation_reminder_sent_at: null,
    }],
    sms_logs: [],
  }
})

describe('GET /api/cron/confirmation-reminder — claim-before-send', () => {
  it('writes confirmation_reminder_sent_at BEFORE calling sendClientSMS, not after', async () => {
    let sentAtSendTime: unknown = 'not-yet-checked'
    sendClientSMS.mockImplementationOnce(async () => {
      sentAtSendTime = h.store.bookings.find((b) => b.id === 'b1')!.confirmation_reminder_sent_at
      return { success: true }
    })

    await GET(req() as never)

    expect(sentAtSendTime).not.toBe('not-yet-checked')
    expect(sentAtSendTime).not.toBeNull()
  })

  it('claims confirmation_reminder_sent_at before sending, and only sends once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendClientSMS).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.confirmation_reminder_sent_at).not.toBeNull()
  })

  it('two overlapping invocations racing the same booking only send once', async () => {
    // Real-world precondition: both invocations' SELECTs read the same
    // booking with confirmation_reminder_sent_at:null before either's CAS
    // claim lands (this cron loops every active tenant with no run-lock).
    // The losing invocation's claim must affect 0 rows since the row no
    // longer matches the `.is(null)` condition it read.
    const [first, second] = await Promise.all([GET(req() as never), GET(req() as never)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.sent + secondJson.sent).toBe(1)
    expect(sendClientSMS).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.confirmation_reminder_sent_at).not.toBeNull()
  })

  it('does not resend once already claimed by a prior run', async () => {
    h.store.bookings[0].confirmation_reminder_sent_at = '2026-07-17T17:30:00.000Z'

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(sendClientSMS).not.toHaveBeenCalled()
  })
})
