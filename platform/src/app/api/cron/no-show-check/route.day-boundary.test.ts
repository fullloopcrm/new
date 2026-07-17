/**
 * GET /api/cron/no-show-check — start_time is naive-ET (recurring.ts's
 * nowNaiveET() convention), but the 45-minute grace cutoff and the 24h
 * "skip old stragglers" floor were both built from true-UTC
 * new Date(...).toISOString(). Since UTC runs ahead of ET, both bounds read
 * as a LATER clock time than the real ET instant, so a booking genuinely
 * still inside its 45-minute grace window (cleaner could still be en route)
 * got flipped to no_show up to ~4-5h early.
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
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/no-show-check', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 2:20pm EDT (18:20 UTC). A booking that started at 2:00pm ET (20 real
// minutes ago, well inside the 45-minute grace window) must NOT be flipped.
const NOW = new Date('2026-07-17T18:20:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  h.store = {
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', status: 'scheduled', check_in_time: null,
      start_time: '2026-07-17T14:00:00', client_id: 'client-1', team_member_id: 'tm-1',
      clients: { name: 'Jane Doe' }, team_members: { name: 'Sam' },
    }],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/no-show-check — ET/UTC gap fix', () => {
  it('does NOT flip a booking still inside its true 45-minute ET grace window', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.flipped).toBe(0)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.status).toBe('scheduled')
  })

  it('flips a booking once the true 45-minute ET grace window has actually elapsed', async () => {
    h.store.bookings[0].start_time = '2026-07-17T13:00:00' // 1:00pm ET, 80 real minutes ago

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.flipped).toBe(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.status).toBe('no_show')
  })
})
