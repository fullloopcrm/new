import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/jobs/[id]/sessions resolved explicit assignee_ids/team_member_id
 * against team_members filtered only by tenant_id — an inactive/terminated
 * member's id was accepted into the assignee set (and could become the
 * booking's lead team_member_id) with zero status check. Job sessions are
 * the primary scheduling path for multi-touch jobs, so this let a terminated
 * employee keep getting scheduled work indefinitely.
 */

const { findSchedulingConflicts } = vi.hoisted(() => ({
  findSchedulingConflicts: vi.fn(async () => [] as { id: string; start: string | null; end: string | null }[]),
}))

const bookingInserts: Record<string, unknown>[] = []
const TEAM_MEMBERS = [
  { id: 'tm-active', tenant_id: 'T', status: 'active' },
  { id: 'tm-inactive', tenant_id: 'T', status: 'inactive' },
]

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
    const eqs: Record<string, unknown> = {}
    const neqs: Record<string, unknown> = {}
    let inIds: string[] | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      neq: (col: string, val: unknown) => { neqs[col] = val; return chain },
      in: (_col: string, vals: string[]) => { inIds = vals; return chain },
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
        if (table === 'bookings') {
          const inserted = bookingInserts[bookingInserts.length - 1] || {}
          return { data: { id: 'new-booking', start_time: '2026-08-01T10:00:00.000Z', end_time: '2026-08-01T12:00:00.000Z', status: 'confirmed', team_member_id: inserted.team_member_id ?? null, crew_id: null, service_type: 'Job session' }, error: null }
        }
        return { data: null, error: null }
      },
      then: (onFulfilled: (v: unknown) => unknown) => {
        if (table === 'team_members') {
          const rows = TEAM_MEMBERS.filter((m) =>
            Object.entries(eqs).every(([k, v]) => (m as Record<string, unknown>)[k] === v) &&
            Object.entries(neqs).every(([k, v]) => (m as Record<string, unknown>)[k] !== v) &&
            (inIds === null || inIds.includes(m.id)))
          return Promise.resolve({ data: rows, error: null }).then(onFulfilled)
        }
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

describe('POST /api/jobs/[id]/sessions — excludes inactive team members from the assignee set', () => {
  it('does not assign an inactive team_member_id as the lead', async () => {
    const res = await POST(req({ start_time: '2026-08-01T10:00:00', team_member_id: 'tm-inactive' }), params)
    expect(res.status).toBe(200)
    expect(bookingInserts).toHaveLength(1)
    expect(bookingInserts[0].team_member_id).toBe(null)
  })

  it('still assigns an active team_member_id as the lead', async () => {
    const res = await POST(req({ start_time: '2026-08-01T10:00:00', team_member_id: 'tm-active' }), params)
    expect(res.status).toBe(200)
    expect(bookingInserts).toHaveLength(1)
    expect(bookingInserts[0].team_member_id).toBe('tm-active')
  })

  it('drops an inactive id from a mixed assignee_ids list but keeps the active one', async () => {
    const res = await POST(req({ start_time: '2026-08-01T10:00:00', assignee_ids: ['tm-active', 'tm-inactive'] }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assignees).toEqual(['tm-active'])
  })
})
