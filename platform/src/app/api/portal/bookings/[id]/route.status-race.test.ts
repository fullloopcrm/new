/**
 * PUT /api/portal/bookings/[id] — TOCTOU race with a concurrent admin status
 * change.
 *
 * The route reads `oldBooking` once (for notification context only), then
 * unconditionally UPDATEs with no re-check in the write's own WHERE clause.
 * An admin moving this booking to a terminal state (completed, paid,
 * no_show) between that read and this write used to get silently reverted
 * by the customer's in-flight reschedule/cancel.
 *
 * FIX: re-assert the pre-read status in the write's own WHERE against the
 * CURRENT DB row. Zero rows matched -> 409 instead of silently reverting the
 * concurrent admin change.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  verifyPortalToken: vi.fn(),
}))

/** Set by a test to inject a concurrent write right after the route's own
 *  oldBooking SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'bookings') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('../../auth/token', () => ({ verifyPortalToken: (...a: unknown[]) => h.verifyPortalToken(...a) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { PUT } from './route'

const TENANT_ID = 'tenant-A'
const CLIENT_ID = 'client-A1'
const BOOKING_ID = 'book-1'
const AUTH = { id: CLIENT_ID, tid: TENANT_ID }

const putReq = (body: unknown, token = 'valid-token') =>
  new Request('http://x', { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.verifyPortalToken.mockReset()
  h.verifyPortalToken.mockImplementation((token: string) => (token === 'valid-token' ? AUTH : null))
  afterInitialRead.fn = null
})

describe('PUT /api/portal/bookings/[id] — concurrent-status-change race', () => {
  it('refuses to revert a booking an admin already completed concurrently', async () => {
    h.store = {
      bookings: [{
        id: BOOKING_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, status: 'scheduled',
        start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00', team_member_id: null,
      }],
    }
    afterInitialRead.fn = () => {
      h.store.bookings[0] = { ...h.store.bookings[0], status: 'completed' }
    }

    const res = await PUT(putReq({ status: 'cancelled' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.bookings[0].status).toBe('completed')
  })

  it('still cancels a booking whose status did not change concurrently (no regression)', async () => {
    h.store = {
      bookings: [{
        id: BOOKING_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, status: 'scheduled',
        start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00', team_member_id: null,
      }],
    }

    const res = await PUT(putReq({ status: 'cancelled' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.status).toBe('cancelled')
  })
})
