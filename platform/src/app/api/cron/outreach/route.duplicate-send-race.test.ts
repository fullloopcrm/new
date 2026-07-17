/**
 * GET /api/cron/outreach — concurrent-invocation duplicate-send race.
 *
 * The seasonal outreach loop sent the SMS FIRST, then inserted the
 * outreach_log row (the actual dedup source, with a real unique constraint
 * on (tenant_id, client_id, moment_id) behind it). Two overlapping
 * invocations -- a manual re-trigger racing the scheduled Saturday run, or a
 * platform-retried delivery -- could both read the same empty `sentIds` set
 * before either's log insert landed, and both text the same client for the
 * same moment. The unique constraint only deduped the LOG row (silently
 * absorbed as a caught "duplicate key" error); it never stopped the second
 * SMS from actually going out. Same bug class as rating-prompt/
 * payment-reminder/comhub-email's claim-before-send fixes.
 *
 * Fix: insert the outreach_log row FIRST (the unique constraint is the
 * atomic claim), and only send if that insert succeeds.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

const sendSMS = vi.fn(async () => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMS(...args) }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({ comms: { retention: { sms: true } }, timing: {} }),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/outreach', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  // June 21 -- inside the "summer" moment window (sendMonth:5, sendDayStart:20-22).
  vi.setSystemTime(new Date('2026-06-21T14:00:00.000Z'))
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
  h.fake = createFakeSupabase({
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'key', telnyx_phone: '+15551234567', selena_config: null }],
    clients: [{
      id: 'client-1', tenant_id: 'tenant-A', name: 'Jane', phone: '+15559998888',
      status: 'active', do_not_service: false, sms_marketing_opt_out: false, sms_consent: true,
      outreach_count: 0,
    }],
    bookings: [],
    recurring_schedules: [],
    deals: [],
    outreach_log: [],
  })
  h.fake._addUniqueConstraint('outreach_log', 'client_id')
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('concurrent outreach invocations racing the same client + moment', () => {
  it('texts the client exactly once', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(firstJson.sent + secondJson.sent).toBe(1)
    expect(h.fake!._all('outreach_log').filter((r) => r.client_id === 'client-1')).toHaveLength(1)
  })
})
