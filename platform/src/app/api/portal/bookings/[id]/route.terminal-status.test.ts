/**
 * PUT /api/portal/bookings/[id] — terminal-status guard.
 *
 * portal/bookings/[id]/page.tsx's own canReschedule/canCancel constants only
 * control which buttons render -- the backend previously enforced neither,
 * so an authenticated client could PUT a new start_time/end_time or
 * {status:'cancelled'} directly at an already-completed/paid/no_show
 * booking. finance/payroll-prep and finance/cleaner-income both filter on
 * .eq('status','completed') to compute team-member pay, so silently
 * flipping or rescheduling a completed booking corrupts those reports with
 * no error and no audit trail.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  verifyPortalToken: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('../../auth/token', () => ({ verifyPortalToken: (...a: unknown[]) => h.verifyPortalToken(...a) }))
const notifyMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/notify', () => ({ notify: (...a: unknown[]) => notifyMock(...a) }))

import { PUT } from './route'

const TENANT_ID = 'tenant-A'
const CLIENT_ID = 'client-A1'
const BOOKING_ID = 'book-1'
const AUTH = { id: CLIENT_ID, tid: TENANT_ID }

const putReq = (body: unknown, token = 'valid-token') =>
  new Request('http://x', { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

function seedBooking(status: string) {
  h.store = {
    bookings: [{
      id: BOOKING_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, status,
      start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00', team_member_id: null,
    }],
  }
}

beforeEach(() => {
  h.seq = 0
  h.verifyPortalToken.mockReset()
  h.verifyPortalToken.mockImplementation((token: string) => (token === 'valid-token' ? AUTH : null))
  notifyMock.mockClear()
})

describe('PUT /api/portal/bookings/[id] — terminal-status cancel guard', () => {
  it.each(['completed', 'paid', 'cancelled', 'no_show'])(
    'rejects cancelling a %s booking without touching the row',
    async (status) => {
      seedBooking(status)
      const res = await PUT(putReq({ status: 'cancelled' }), params(BOOKING_ID))
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toMatch(new RegExp(status))
      expect(h.store.bookings[0].status).toBe(status)
      expect(notifyMock).not.toHaveBeenCalled()
    }
  )

  it('still allows cancelling a scheduled booking (no regression)', async () => {
    seedBooking('scheduled')
    const res = await PUT(putReq({ status: 'cancelled' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.status).toBe('cancelled')
  })
})

describe('PUT /api/portal/bookings/[id] — terminal-status reschedule guard', () => {
  it.each(['completed', 'paid', 'cancelled', 'no_show'])(
    'rejects a start_time change on a %s booking without touching the row',
    async (status) => {
      seedBooking(status)
      const res = await PUT(putReq({ start_time: '2099-02-01T10:00:00Z' }), params(BOOKING_ID))
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toMatch(new RegExp(status))
      expect(h.store.bookings[0].start_time).toBe('2026-08-01T09:00:00')
    }
  )

  it.each(['completed', 'paid', 'cancelled', 'no_show'])(
    'rejects an end_time-only change on a %s booking',
    async (status) => {
      seedBooking(status)
      const res = await PUT(putReq({ end_time: '2099-02-01T12:00:00Z' }), params(BOOKING_ID))

      expect(res.status).toBe(400)
      expect(h.store.bookings[0].end_time).toBe('2026-08-01T11:00:00')
    }
  )

  it('still allows rescheduling a still-open (pending) booking (no regression)', async () => {
    seedBooking('pending')
    const res = await PUT(putReq({ start_time: '2099-02-01T10:00:00Z' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.start_time).toBe('2099-02-01T10:00:00Z')
  })

  it('unrelated field edits (notes) still work regardless of terminal status', async () => {
    seedBooking('completed')
    const res = await PUT(putReq({ notes: 'left a key under the mat' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.notes).toBe('left a key under the mat')
  })
})
