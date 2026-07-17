import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/jobs/[id]/sessions assigned a team member to a new booking with
 * zero double-booking check — the sibling POST /api/bookings has always
 * enforced this (findSchedulingConflicts, shared after this fix). A job
 * session is the primary scheduling path for multi-touch jobs (dumpster
 * swap/pickup, junk-removal multi-stop, moving load/unload), so this gap let
 * a crew member get scheduled onto two overlapping sessions with zero
 * warning. Fixed to call the same conflict check before inserting.
 */

const { findSchedulingConflicts } = vi.hoisted(() => ({
  findSchedulingConflicts: vi.fn(async () => [] as { id: string; start: string | null; end: string | null }[]),
}))

const bookingInserts: Record<string, unknown>[] = []

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'T' }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent: async () => {},
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ booking_buffer_minutes: 30 }),
}))
vi.mock('@/lib/schedule/conflict-check', () => ({ findSchedulingConflicts }))

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        const list = Array.isArray(rows) ? rows : [rows]
        if (table === 'bookings') bookingInserts.push(...list)
        return chain
      },
      maybeSingle: async () => {
        if (table === 'jobs') return { data: { id: 'job-1', client_id: 'c1', title: 'Test Job' }, error: null }
        return { data: null, error: null }
      },
      single: async () => {
        if (table === 'jobs') return { data: { id: 'job-1', client_id: 'c1', title: 'Test Job' }, error: null }
        if (table === 'bookings') return { data: { id: 'new-booking', start_time: '2026-08-01T10:00:00.000Z', end_time: '2026-08-01T12:00:00.000Z', status: 'confirmed', team_member_id: 'tm-1', crew_id: null, service_type: 'Job session' }, error: null }
        return { data: null, error: null }
      },
      then: (onFulfilled: (v: unknown) => unknown) => {
        if (table === 'team_members') return Promise.resolve({ data: [{ id: 'tm-1' }], error: null }).then(onFulfilled)
        return Promise.resolve({ data: [], error: null }).then(onFulfilled)
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { POST } from '@/app/api/jobs/[id]/sessions/route'

const params = { params: Promise.resolve({ id: 'job-1' }) }
function req(body: Record<string, unknown>): Request {
  return new Request('https://app.fullloop.example/api/jobs/job-1/sessions', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  bookingInserts.length = 0
  findSchedulingConflicts.mockReset()
  findSchedulingConflicts.mockResolvedValue([])
})

describe('POST /api/jobs/[id]/sessions — double-booking guard', () => {
  it('creates the session when the assigned team member has no conflict', async () => {
    const res = await POST(req({ start_time: '2026-08-01T10:00:00', team_member_id: 'tm-1' }), params)
    expect(res.status).toBe(200)
    expect(findSchedulingConflicts).toHaveBeenCalledWith('T', 'tm-1', expect.any(String), expect.any(String), 30)
    expect(bookingInserts).toHaveLength(1)
  })

  it('rejects with 409 and does not insert a booking when the team member is double-booked', async () => {
    findSchedulingConflicts.mockResolvedValue([{ id: 'other-booking', start: '2026-08-01T09:00:00Z', end: '2026-08-01T11:00:00Z' }])
    const res = await POST(req({ start_time: '2026-08-01T10:00:00', team_member_id: 'tm-1' }), params)
    expect(res.status).toBe(409)
    expect(bookingInserts).toHaveLength(0)
  })

  it('skips the conflict check when no team member is assigned', async () => {
    const res = await POST(req({ start_time: '2026-08-01T10:00:00' }), params)
    expect(res.status).toBe(200)
    expect(findSchedulingConflicts).not.toHaveBeenCalled()
  })
})
