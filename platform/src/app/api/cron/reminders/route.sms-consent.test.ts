/**
 * GET /api/cron/reminders — client SMS reminders (day-based + 2-hour) called
 * sendSMS() directly, bypassing notify()'s central sms_consent gate. A client
 * who'd texted STOP (webhooks/telnyx sets clients.sms_consent=false
 * tenant-wide) kept getting booking-reminder texts from this cron. Same bug
 * class already fixed on payment-reminder/post-job-followup/confirmations.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const notifyMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
const sendSMSMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: {}, timing: { reminder_days: [], reminder_hours_before: [] } })),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/reminders', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  process.env.CRON_SECRET = 'test-cron-secret'
  notifyMock.mockClear()
  sendSMSMock.mockClear()
  h.seq = 0
  h.store = {
    tenants: [{
      id: 'tenant-A', name: 'Acme Cleaning', status: 'active',
      telnyx_api_key: 'key', telnyx_phone: '+15559999999',
    }],
    bookings: [],
    notifications: [],
  }
})

afterEach(() => {
  vi.useRealTimers()
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
})

describe('GET /api/cron/reminders — client SMS respects sms_consent', () => {
  it('skips the day-based SMS reminder for an opted-out client but still emails them', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z')) // true 8am ET instant
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', team_member_id: null, status: 'scheduled',
      start_time: '2026-07-18T14:00:00', end_time: '2026-07-18T16:00:00', service_type: 'Cleaning',
      clients: { name: 'Jane Doe', phone: '+15550001111', email: 'jane@example.com', sms_consent: false },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.results.some((r: { type: string; booking_id: string }) => r.type === 'reminder_1day' && r.booking_id === 'b1')).toBe(true)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-A', recipientId: 'client-1', channel: 'email' }))
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('sends the day-based SMS reminder for a client with no opt-out on file', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'))
    h.store.bookings = [{
      id: 'b2', tenant_id: 'tenant-A', client_id: 'client-1', team_member_id: null, status: 'scheduled',
      start_time: '2026-07-18T14:00:00', end_time: '2026-07-18T16:00:00', service_type: 'Cleaning',
      clients: { name: 'Jane Doe', phone: '+15550001111', email: 'jane@example.com', sms_consent: null },
      team_members: null,
    }]

    await GET(req() as never)

    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15550001111' }))
  })

  it('skips the 2-hour SMS reminder for an opted-out client', async () => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
    h.store.bookings = [{
      id: 'b3', tenant_id: 'tenant-A', client_id: 'client-1', team_member_id: null, status: 'confirmed',
      start_time: startTime, service_type: 'Cleaning',
      clients: { name: 'Jane Doe', phone: '+15550001111', email: 'jane@example.com', sms_consent: false },
      team_members: null,
    }]

    await GET(req() as never)

    expect(sendSMSMock).not.toHaveBeenCalledWith(expect.objectContaining({ to: '+15550001111' }))
  })
})
