/**
 * POST /api/schedules -- when the caller omits preferred_time, the route used
 * to build the first booking's start hour/minute from `new Date().getUTCHours()
 * /getUTCMinutes()` (the true UTC clock) and feed those digits into Date.UTC()
 * as if they were ET wall-clock digits -- the same "impersonate UTC to encode
 * ET" trick startDate's date component uses correctly, but applied to the
 * wrong clock. Every schedule created without an explicit preferred_time got
 * its first 4 weeks of bookings stamped with the server's UTC clock reading
 * instead of the real ET time-of-day, a systematic 4-5h skew (ET/UTC gap).
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * route.day-boundary.test.ts) to simulate Vercel's actual runtime.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  audit: vi.fn(),
  generateRecurringDates: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  generateRecurringDates: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))
vi.mock('@/lib/recurring', async () => {
  const actual = await vi.importActual<typeof import('@/lib/recurring')>('@/lib/recurring')
  return { ...actual, generateRecurringDates: (...a: unknown[]) => h.generateRecurringDates(...a) }
})

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const realTZ = process.env.TZ

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: 'owner' }))
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.generateRecurringDates.mockReset()
  h.generateRecurringDates.mockReturnValue([])
  h.store = { recurring_schedules: [], service_types: [], bookings: [] }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('POST /api/schedules -- missing preferred_time falls back to ET wall-clock time, not server-UTC clock', () => {
  it('created 2pm EDT (18:00 UTC) with no preferred_time anchors the first booking on 14:00, not 18:00', async () => {
    // 2026-07-15 is a Wednesday, 2pm EDT = 18:00 UTC.
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z'))

    await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', day_of_week: 3 }))

    expect(h.generateRecurringDates).toHaveBeenCalledTimes(1)
    const { startDate } = h.generateRecurringDates.mock.calls[0][0] as { startDate: Date }
    // Correct: 14:00 (2pm ET wall clock). The bug stamped 18:00 (the raw UTC
    // clock reading, mislabeled as if it were the ET wall-clock hour).
    expect(startDate.getUTCHours()).toBe(14)
    expect(startDate.getUTCMinutes()).toBe(0)
  })

  it('created 9pm EST (02:00 UTC next day) with no preferred_time anchors on 21:00, not 02:00', async () => {
    // 2026-01-14 is a Wednesday, 9pm EST Jan 14 = 02:00 UTC Jan 15.
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T02:00:00.000Z'))

    await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', day_of_week: 3 }))

    const { startDate } = h.generateRecurringDates.mock.calls[0][0] as { startDate: Date }
    // Correct: 21:00 (9pm ET wall clock, still Wednesday). The bug stamped
    // 02:00 (the raw UTC clock reading).
    expect(startDate.getUTCHours()).toBe(21)
    expect(startDate.getUTCMinutes()).toBe(0)
  })

  it('explicit preferred_time is unaffected by the fallback fix (regression control)', async () => {
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z'))

    await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', day_of_week: 3, preferred_time: '11:30' }))

    const { startDate } = h.generateRecurringDates.mock.calls[0][0] as { startDate: Date }
    expect(startDate.getUTCHours()).toBe(11)
    expect(startDate.getUTCMinutes()).toBe(30)
  })
})
