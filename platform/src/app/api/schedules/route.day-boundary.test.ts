/**
 * POST /api/schedules -- the first-occurrence day-of-week search anchored on
 * `new Date()` + native `.getDay()`/`.setDate()`, which read the SERVER's
 * local calendar (UTC on Vercel), not ET. A schedule created ~8pm-midnight ET
 * (when UTC has already rolled to tomorrow) searched forward from the wrong
 * starting day: a day_of_week that was actually still "today" in ET got
 * skipped entirely, pushing the first generated booking -- and every date
 * after it, since each later date steps a fixed interval off this anchor --
 * a full week later than intended.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * deals/at-risk/route.naive-et.test.ts) to simulate Vercel's actual runtime --
 * this sandbox's own local TZ (America/New_York) would otherwise make the OLD
 * buggy code accidentally behave correctly by coincidence.
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

describe('POST /api/schedules -- day-of-week anchor uses ET calendar day, not server-UTC', () => {
  it('a schedule created 9pm ET Monday for day_of_week=Monday anchors on TODAY (ET), not next Monday', async () => {
    // 2026-07-20 is a Monday. 9pm EDT July 20 = 01:00 UTC July 21 (Tuesday) --
    // the exact window where UTC has already rolled to Tuesday but it's still
    // Monday evening in ET.
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T01:00:00.000Z'))

    await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', day_of_week: 1 }))

    expect(h.generateRecurringDates).toHaveBeenCalledTimes(1)
    const { startDate } = h.generateRecurringDates.mock.calls[0][0] as { startDate: Date }
    // Correct: anchors on 2026-07-20 (still Monday in ET) -- immediate, not a
    // week later. The bug anchored on 2026-07-27 (searching forward from
    // UTC's already-rolled-over Tuesday for the next Monday).
    expect(startDate.toISOString().slice(0, 10)).toBe('2026-07-20')
  })

  it('a schedule created mid-afternoon ET still anchors on the correct day (regression control)', async () => {
    // 2026-07-15 is a Wednesday, 2pm EDT = 18:00 UTC -- well clear of any
    // day-boundary risk either way.
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z'))

    await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', day_of_week: 3 }))

    const { startDate } = h.generateRecurringDates.mock.calls[0][0] as { startDate: Date }
    expect(startDate.toISOString().slice(0, 10)).toBe('2026-07-15')
  })
})
