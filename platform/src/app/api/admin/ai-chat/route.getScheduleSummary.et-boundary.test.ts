import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * executeTool('get_schedule_summary', ...) -- when the AI omits a date (the
 * common case for "what's on my schedule today?"), the tool defaulted via
 * `new Date().toISOString().split('T')[0]`, a true-UTC calendar day. Since
 * UTC's calendar day rolls over ~4-5h (the ET/UTC gap) before ET's real
 * midnight, asking this in the evening ET silently returned TOMORROW's
 * bookings instead of today's.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as this session's other
 * day-boundary tests) to simulate Vercel's actual runtime.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { executeTool } from './route'

// 9:00 PM EDT July 17 -- already 1:00 AM UTC July 18 (UTC's calendar day has
// rolled over to the 18th, but the real ET calendar day is still the 17th).
const NOW = new Date('2026-07-18T01:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'b-today', tenant_id: 'tenant-A', start_time: '2026-07-17T14:00:00', end_time: '2026-07-17T16:00:00', status: 'scheduled', price: 100, service_type: 'clean' },
      { id: 'b-tomorrow', tenant_id: 'tenant-A', start_time: '2026-07-18T14:00:00', end_time: '2026-07-18T16:00:00', status: 'scheduled', price: 100, service_type: 'clean' },
    ],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('executeTool get_schedule_summary -- ET/UTC day-boundary fix', () => {
  it('defaults to the real ET-today and returns only today’s booking', async () => {
    const raw = await executeTool('tenant-A', 'get_schedule_summary', {})
    const json = JSON.parse(raw)

    expect(json.date).toBe('2026-07-17')
    expect(json.bookings.map((b: { id: string }) => b.id)).toEqual(['b-today'])
  })
})
