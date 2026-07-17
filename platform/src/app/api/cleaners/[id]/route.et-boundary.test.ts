import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/cleaners/[id] -- unavailable_dates are naive ET calendar dates
 * (set via the team-member date picker), but the future-dates filter built
 * "today" via `new Date().toISOString().split('T')[0]`, a true-UTC calendar
 * day. Since UTC's calendar day rolls over ~4-5h (the ET/UTC gap) before
 * ET's real midnight, saving a team member's schedule in the evening ET
 * silently dropped a real still-current ET unavailable date out of the
 * persisted list -- treating it as already past a day early.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique used across this session's
 * other day-boundary tests) to simulate Vercel's actual runtime.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/geo', () => ({ geocodeAddress: vi.fn(async () => null) }))

import { PUT } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

// 9:00 PM EDT July 17 -- already 1:00 AM UTC July 18 (UTC's calendar day has
// rolled over to the 18th, but the real ET calendar day is still the 17th).
const NOW = new Date('2026-07-18T01:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.store = {
    team_members: [{ id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alice' }],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('PUT /api/cleaners/[id] -- unavailable_dates ET/UTC day-boundary fix', () => {
  it('keeps a real ET-today unavailable date while UTC has already rolled to the 18th', async () => {
    const res = await PUT(putReq({ unavailable_dates: ['2026-07-17', '2026-07-19'] }) as never, params('tm-A1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unavailable_dates).toEqual(['2026-07-17', '2026-07-19'])
  })

  it('still drops a genuinely past date', async () => {
    const res = await PUT(putReq({ unavailable_dates: ['2026-07-16', '2026-07-19'] }) as never, params('tm-A1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unavailable_dates).toEqual(['2026-07-19'])
  })
})
