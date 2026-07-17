/**
 * GET /api/cron/outreach — the "exclude clients with upcoming bookings" gate
 * compared bookings.start_time (naive-ET, see lib/recurring.ts's nowNaiveET
 * header) against a true-UTC `new Date().toISOString()`. Since UTC runs
 * ahead of ET, that made the floor read as a LATER clock time than the real
 * ET instant, silently excluding any client with a booking inside the true
 * ET/UTC gap window from `scheduledIds` -- so they'd incorrectly receive an
 * unwanted seasonal outreach text despite already having an appointment
 * booked. Same bug class fixed across this session.
 *
 * Forces `process.env.TZ = 'UTC'` to simulate Vercel's actual runtime --
 * this sandbox's own local TZ (America/New_York) would otherwise make the
 * OLD code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

const sendSMS = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMS(...args) }))

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
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', status: 'active', telnyx_api_key: 'key', telnyx_phone: '+15551234567', selena_config: null }],
    clients: [{
      id: 'client-1', tenant_id: 'tenant-A', name: 'Jane', phone: '+15559998888',
      status: 'active', do_not_service: false, sms_marketing_opt_out: false, sms_consent: true,
      outreach_count: 0,
    }],
    bookings: [],
    recurring_schedules: [],
    deals: [],
    outreach_log: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/outreach — ET/UTC gap fix', () => {
  it('does not text a client whose next booking is ~2.5 real hours away (inside the ET/UTC gap window)', async () => {
    // 10pm EDT June 20 == 2am UTC June 21 -- "now". A booking at 12:30am EDT
    // June 21 (naive-ET) is genuinely ~2.5h upcoming, but a true-UTC
    // `nowIso` here would read as 2am UTC, later than the naive-ET string
    // compares lexicographically -- silently treating the client as having
    // no upcoming booking.
    vi.setSystemTime(new Date('2026-06-21T02:00:00.000Z'))
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', status: 'scheduled',
      start_time: '2026-06-21T00:30:00',
    }]

    const res = await GET(req())
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(sendSMS).not.toHaveBeenCalled()
  })
})
