/**
 * GET /api/cron/confirmation-reminder — start_time is naive-ET (recurring.ts's
 * nowNaiveET() convention), but the "still upcoming" gate compared it against
 * a raw true-UTC new Date().toISOString(). Since UTC runs ahead of ET, that
 * made the gate's floor read as a LATER clock time than the real ET instant,
 * silently excluding any pending booking inside the true ET/UTC gap window
 * from ever getting its confirmation reminder sent.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * resolve-date-timezone.test.ts) to simulate Vercel's actual runtime — this
 * sandbox's own local TZ (America/New_York) would otherwise make the OLD code
 * accidentally behave correctly by coincidence.
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

// 2:00pm EDT (18:00 UTC) -- a booking starting at this exact ET instant is
// genuinely still upcoming and should get its reminder.
const NOW = new Date('2026-07-17T18:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
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
      notes: null,
    }],
    sms_logs: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/confirmation-reminder — ET/UTC gap fix', () => {
  it('sends a reminder for a still-upcoming (ET) pending booking at a true 2pm EDT instant', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendClientSMS).toHaveBeenCalledTimes(1)
  })
})
