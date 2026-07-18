/**
 * GET /api/cron/health-check's stale-in_progress-booking auto-complete had
 * two real bugs on the same write:
 *
 * 1. Data loss: the bulk `.in('id', ids).update({ notes: '[Auto-completed...]' })`
 *    OVERWROTE the booking's existing `notes` field instead of appending --
 *    every other write path on this column (team-portal/checkin's GPS flag)
 *    appends via `(booking.notes || '') + note`, this one silently destroyed
 *    whatever was already there (arrival details, damage reports, etc.)
 *    for every stale booking this cron ever touched.
 *
 * 2. Check-then-act race: the UPDATE only carried `.in('id', ids)`, trusting
 *    the SELECT's `status='in_progress'` snapshot instead of re-asserting it
 *    in the write's own WHERE -- a real checkout landing between the SELECT
 *    and this UPDATE got silently reverted back to 'completed' with a
 *    fabricated system note.
 *
 * Fix: per-row update with `.eq('status', 'in_progress')` re-asserted in the
 * WHERE, and notes appended (not replaced).
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
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/health-check', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const FOUR_HOURS_AGO_END_TIME = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  h.seq = 0
  h.store = {
    tenants: [],
    notifications: [],
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', status: 'in_progress',
      end_time: FOUR_HOURS_AGO_END_TIME,
      notes: 'Client asked to leave spare key under the mat.',
    }],
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/cron/health-check — stale in_progress booking cleanup', () => {
  it('appends the auto-complete note instead of destroying existing notes', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    const row = h.store.bookings.find((b) => b.id === 'b1')!
    expect(row.status).toBe('completed')
    expect(row.notes).toContain('Client asked to leave spare key under the mat.')
    expect(row.notes).toContain('[Auto-completed by system')
    expect(json.fixes.join(' ')).toContain('Auto-completed 1 stale in-progress bookings')
  })

  it('does NOT revert a booking that was legitimately checked out between the SELECT and the write', async () => {
    // The route reads `bookings` twice for one candidate: once for the
    // stale-status SELECT, once for that row's own claim UPDATE. Land a real
    // checkout (status flips to 'completed' with the crew's own real notes)
    // on the second access -- the same technique used to prove the sibling
    // no-show-check race.
    let accessCount = 0
    const bookingsArray = h.store.bookings
    Object.defineProperty(h.store, 'bookings', {
      configurable: true,
      get() {
        accessCount++
        if (accessCount === 2) {
          const row = bookingsArray.find((b) => b.id === 'b1')!
          row.status = 'completed'
          row.notes = 'Client asked to leave spare key under the mat.\n\nCrew: all done, no issues.'
        }
        return bookingsArray
      },
    })

    const res = await GET(req() as never)
    const json = await res.json()

    const row = bookingsArray.find((b) => b.id === 'b1')!
    expect(row.notes).toBe('Client asked to leave spare key under the mat.\n\nCrew: all done, no issues.')
    expect(row.notes).not.toContain('Auto-completed by system')
    expect(json.fixes.join(' ')).not.toContain('Auto-completed')
  })
})
