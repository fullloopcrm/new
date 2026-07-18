/**
 * GET /api/cron/no-show-check — the flip-to-no_show UPDATE only carried
 * `.eq('id', b.id).eq('tenant_id', b.tenant_id)`, trusting the candidate
 * SELECT's snapshot of status/check_in_time instead of re-checking either
 * inside the write. A team member checking in for real (team-portal/checkin,
 * which sets check_in_time + status='in_progress') in the gap between the
 * SELECT and this row's turn in the sequential per-candidate loop silently
 * got overwritten back to 'no_show' -- corrupting a legitimately
 * in-progress booking's status (feeds finance/cash-flow, the calendar, and
 * client-facing state).
 *
 * Fix: the UPDATE re-asserts `.in('status', [...]).is('check_in_time', null)`
 * in its own WHERE and only proceeds (notify) if the claim actually landed.
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
const notify = vi.fn(async (_args: unknown) => {})
vi.mock('@/lib/notify', () => ({ notify: (args: unknown) => notify(args) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/no-show-check', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// Booking started 80 real minutes before NOW -- well past the 45-min grace
// window, so it's a genuine no-show candidate at SELECT time.
const NOW = new Date('2026-07-17T18:20:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  notify.mockClear()
  h.seq = 0
  h.store = {
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', status: 'scheduled', check_in_time: null,
      start_time: '2026-07-17T13:00:00', client_id: 'client-1', team_member_id: 'tm-1',
      clients: { name: 'Jane Doe' }, team_members: { name: 'Sam' },
    }],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/no-show-check — check-in race', () => {
  it('does NOT flip a booking that gets checked in between the candidate SELECT and its own UPDATE', async () => {
    // The route reads `bookings` exactly twice for a single candidate: once
    // for the candidates SELECT, once for that row's flip UPDATE. Install a
    // getter that lands a real team-portal/checkin (check_in_time set,
    // status='in_progress') on the SECOND access -- the exact gap a slow
    // 500-row loop leaves open in production.
    let accessCount = 0
    const bookingsArray = h.store.bookings
    Object.defineProperty(h.store, 'bookings', {
      configurable: true,
      get() {
        accessCount++
        if (accessCount === 2) {
          const row = bookingsArray.find((b) => b.id === 'b1')!
          row.check_in_time = '2026-07-17T18:19:00.000Z'
          row.status = 'in_progress'
        }
        return bookingsArray
      },
    })

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.flipped).toBe(0)
    expect(notify).not.toHaveBeenCalled()
    expect(bookingsArray.find((b) => b.id === 'b1')!.status).toBe('in_progress')
  })

  it('still flips a genuine no-show and fires notify exactly once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.flipped).toBe(1)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.status).toBe('no_show')
  })
})
