/**
 * GET /api/cron/confirmations — the CLIENT DAY-BEFORE CONFIRMATION branch
 * called the raw sendSMS() from '@/lib/sms' with no sms_consent check, same
 * consent-bypass bug class as payment-followup-daily/payment-reminder.
 * webhooks/telnyx's STOP handler sets clients.sms_consent=false tenant-wide
 * (a legally-required blanket opt-out) -- this branch ignored it, so an
 * opted-out client with a booking tomorrow still got a "Reply YES to
 * confirm... Reply STOP to opt out" text every hour-cron run, asking them to
 * re-opt-out of something they'd already opted out of.
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
const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: {}, timing: {} })),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/confirmations', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 1pm EDT (17:00 UTC) -- the true ET hour the client day-before branch fires at.
const NOW = new Date('2026-07-17T17:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }],
    bookings: [],
    notifications: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/confirmations — client day-before sms_consent gate', () => {
  it('does NOT text a client who opted out (sms_consent:false)', async () => {
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', status: 'scheduled',
      start_time: '2026-07-18T14:00:00',
      clients: { name: 'Opted Out Client', phone: '+15550001111', sms_consent: false },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).not.toHaveBeenCalled()
    expect(json.results.some((r: { type: string }) => r.type === 'client_confirm')).toBe(false)
  })

  it('still texts a client with no explicit opt-out (sms_consent:true or unset)', async () => {
    h.store.bookings = [{
      id: 'b2', tenant_id: 'tenant-A', client_id: 'client-2', status: 'scheduled',
      start_time: '2026-07-18T14:00:00',
      clients: { name: 'Consenting Client', phone: '+15550002222', sms_consent: true },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(json.results.some((r: { type: string; recipient: string }) => r.type === 'client_confirm' && r.recipient === 'Consenting Client')).toBe(true)
  })
})
