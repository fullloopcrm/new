import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * DELETE /api/jobs/[id]/sessions/[sessionId] hard-deletes the same `bookings`
 * row as DELETE /api/bookings/[id] (a "session" is just a booking carrying a
 * job_id), but did it through a separate handler that never called
 * checkBookingDeletable — so a completed/paid session with a rating,
 * referral commission, payment, or payout could be deleted here even though
 * the sibling route already blocks it. Wired in the same guard.
 */

const { TENANT, JOB, logJobEvent } = vi.hoisted(() => ({
  TENANT: 'T',
  JOB: 'job-1',
  logJobEvent: vi.fn(async () => {}),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent,
  releasePaymentsForEvent: vi.fn(async () => 0),
  shapeSession: (b: unknown) => b,
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    // status:'scheduled', no check_in_time, no team_member_pay -- deliberately
    // NOT 'completed'/'paid' so these fixtures isolate the ratings/payments-
    // table checks under test, instead of tripping the guard's separate
    // "completed/paid status = real job history" check first (see
    // src/lib/booking-delete-guard.test.ts for that check's own coverage).
    bookings: [
      { id: 'session-clean', tenant_id: TENANT, job_id: JOB, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'scheduled', team_member_id: null },
      { id: 'session-rated', tenant_id: TENANT, job_id: JOB, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'scheduled', team_member_id: null },
      { id: 'session-paid', tenant_id: TENANT, job_id: JOB, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'scheduled', team_member_id: null },
    ],
    ratings: [{ id: 'r-1', tenant_id: TENANT, booking_id: 'session-rated', service_rating: 5 }],
    payments: [{ id: 'p-1', tenant_id: TENANT, booking_id: 'session-paid', amount_cents: 10000 }],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (sessionId: string) => ({ params: Promise.resolve({ id: JOB, sessionId }) })
const delReq = () => new Request('http://x', { method: 'DELETE' })

beforeEach(() => {
  logJobEvent.mockClear()
})

describe('DELETE /api/jobs/[id]/sessions/[sessionId] — booking delete guard', () => {
  it('deletes a session with no rating/commission/payment/payout history', async () => {
    const res = await DELETE(delReq(), params('session-clean'))
    expect(res.status).toBe(200)
    expect(fake._all('bookings').find((r) => r.id === 'session-clean')).toBeUndefined()
  })

  it('blocks deleting a session with a rating on file', async () => {
    const res = await DELETE(delReq(), params('session-rated'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/rating/i)
    expect(fake._all('bookings').find((r) => r.id === 'session-rated')).toBeDefined()
    expect(logJobEvent).not.toHaveBeenCalled()
  })

  it('blocks deleting a session with a payment on file', async () => {
    const res = await DELETE(delReq(), params('session-paid'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/payment/i)
    expect(fake._all('bookings').find((r) => r.id === 'session-paid')).toBeDefined()
  })

  it('returns 404 for a session that does not belong to this job', async () => {
    const res = await DELETE(delReq(), params('nope'))
    expect(res.status).toBe(404)
  })
})
