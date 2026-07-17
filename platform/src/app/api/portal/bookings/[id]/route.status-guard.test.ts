import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PUT /api/portal/bookings/[id] — client self-service reschedule/cancel had
 * zero server-side status guard. The portal UI only shows the Reschedule
 * button for `pending`/`scheduled`/`confirmed` bookings and the Cancel
 * button for `scheduled`/`confirmed` (portal/bookings/[id]/page.tsx's own
 * `canReschedule`/`canCancel`), but this bearer-token-authenticated API
 * route trusted the client entirely — any authenticated client could POST
 * `{status:'cancelled'}` or a new `start_time` directly at a `completed`
 * booking's own id and the backend applied it unconditionally.
 *
 * Same "destructive/state-corrupting op with no server-side enforcement of
 * the status the UI already implies" shape as items (118)/(122)/(123), on a
 * fresh surface (client self-service portal, not admin dashboard) those
 * fixes never touched. Financially real: finance/payroll-prep and
 * finance/cleaner-income both key their `.eq('status', 'completed')` query
 * off this exact column — flipping a completed booking to 'cancelled'
 * silently zeroes out the assigned team member's pay for work already done,
 * and fires cancellation notifications for a job that already happened.
 *
 * Proves the fix: cancelling requires status in ['scheduled','confirmed'],
 * rescheduling (start_time/end_time change) requires status in
 * ['pending','scheduled','confirmed'] — the exact same sets the UI already
 * uses to decide which buttons to show, now enforced server-side too.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))
const { notifyMock } = vi.hoisted(() => ({ notifyMock: vi.fn(async (_args: Record<string, unknown>) => ({})) }))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-A'
const CLIENT_ID = 'client-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function req(body: unknown): Request {
  return new Request('http://x/api/portal/bookings/id', {
    method: 'PUT',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  })
}

function seedBooking(status: string) {
  fake._seed('bookings', [{
    id: 'bk-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, status,
    start_time: '2026-01-01T10:00:00Z', end_time: null, team_member_id: 'tm-1',
  }])
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: CLIENT_ID, tid: TENANT_ID }
  notifyMock.mockClear()
})

describe('PUT /api/portal/bookings/[id] — cancel status guard', () => {
  it('rejects cancelling a completed booking (400, status unchanged)', async () => {
    seedBooking('completed')
    const res = await PUT(req({ status: 'cancelled' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(400)
    expect(fake._all('bookings')[0].status).toBe('completed')
  })

  it('rejects cancelling an already-cancelled booking (400, status unchanged)', async () => {
    seedBooking('cancelled')
    const res = await PUT(req({ status: 'cancelled' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(400)
  })

  it('allows cancelling a scheduled booking (200, status updated)', async () => {
    seedBooking('scheduled')
    const res = await PUT(req({ status: 'cancelled' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].status).toBe('cancelled')
  })

  it('allows cancelling a confirmed booking (200, status updated)', async () => {
    seedBooking('confirmed')
    const res = await PUT(req({ status: 'cancelled' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].status).toBe('cancelled')
  })
})

describe('PUT /api/portal/bookings/[id] — reschedule status guard', () => {
  it('rejects rescheduling a completed booking (400, start_time unchanged)', async () => {
    seedBooking('completed')
    const res = await PUT(req({ start_time: '2026-06-01T10:00:00Z' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(400)
    expect(fake._all('bookings')[0].start_time).toBe('2026-01-01T10:00:00Z')
  })

  it('rejects rescheduling a cancelled booking (400)', async () => {
    seedBooking('cancelled')
    const res = await PUT(req({ start_time: '2026-06-01T10:00:00Z' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(400)
  })

  it('allows rescheduling a pending booking (200, start_time updated)', async () => {
    seedBooking('pending')
    const res = await PUT(req({ start_time: '2026-06-01T10:00:00Z' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].start_time).toBe('2026-06-01T10:00:00Z')
  })

  it('allows rescheduling a scheduled booking (200, start_time updated)', async () => {
    seedBooking('scheduled')
    const res = await PUT(req({ start_time: '2026-06-01T10:00:00Z' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].start_time).toBe('2026-06-01T10:00:00Z')
  })
})

describe('PUT /api/portal/bookings/[id] — unrelated field edits still work regardless of status', () => {
  it('still allows editing notes on a completed booking', async () => {
    seedBooking('completed')
    const res = await PUT(req({ notes: 'left a key under the mat' }) as never, paramsFor('bk-1'))
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].notes).toBe('left a key under the mat')
  })
})
