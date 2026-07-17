import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] reassign path had two gaps:
 * 1. The explicit assignee_ids/team_member_id resolution queried team_members
 *    filtered only by tenant_id (no status check) — unlike its POST sibling
 *    (route.ts, fixed same night), which already excludes 'inactive'. This
 *    PATCH route was missed, so reassigning an existing session could still
 *    plant a terminated employee back onto it.
 * 2. Neither this route nor its POST sibling ever checked status when
 *    resolving a saved crew's members (crew_members has no status of its
 *    own) — a terminated employee left in a crew's membership silently
 *    re-entered the assignee set (and could become the lead) every time that
 *    crew was scheduled, with no expiry.
 */

const sessionsStore = [
  { id: 'session-1', tenant_id: 'T', job_id: 'job-1', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'confirmed', notes: null as string | null, team_member_id: 'tm-1' },
]
const TEAM_MEMBERS = [
  { id: 'tm-active', tenant_id: 'T', status: 'active' },
  { id: 'tm-inactive', tenant_id: 'T', status: 'inactive' },
]
const CREW = {
  id: 'crew-1',
  tenant_id: 'T',
  crew_members: [
    { team_member_id: 'tm-active', team_members: { status: 'active' } },
    { team_member_id: 'tm-inactive', team_members: { status: 'inactive' } },
  ],
}

const { findSchedulingConflicts } = vi.hoisted(() => ({
  findSchedulingConflicts: vi.fn(async () => [] as { id: string; start: string | null; end: string | null }[]),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'T' }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent: async () => {},
  releasePaymentsForEvent: async () => 0,
  shapeSession: (b: unknown) => b,
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ booking_buffer_minutes: 30 }),
}))
vi.mock('@/lib/schedule/conflict-check', () => ({ findSchedulingConflicts }))

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    const neqs: Record<string, unknown> = {}
    let updatePatch: Record<string, unknown> | null = null
    let inIds: string[] | null = null
    const matchesSession = (row: (typeof sessionsStore)[number]) =>
      Object.entries(eqs).every(([k, v]) => (row as Record<string, unknown>)[k] === v)
    const resolveSession = () => {
      const idx = sessionsStore.findIndex(matchesSession)
      if (idx === -1) return { data: null, error: { message: 'not found' } }
      if (updatePatch) sessionsStore[idx] = { ...sessionsStore[idx], ...updatePatch } as (typeof sessionsStore)[number]
      return { data: sessionsStore[idx], error: null }
    }
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      neq: (col: string, val: unknown) => { neqs[col] = val; return chain },
      in: (_col: string, vals: string[]) => { inIds = vals; return chain },
      update: (patch: Record<string, unknown>) => { updatePatch = patch; return chain },
      delete: () => chain,
      insert: () => chain,
      maybeSingle: async () => {
        if (table === 'crews') {
          return eqs.id === CREW.id && eqs.tenant_id === CREW.tenant_id
            ? { data: CREW, error: null }
            : { data: null, error: null }
        }
        return resolveSession()
      },
      single: async () => resolveSession(),
      then: (onFulfilled: (v: unknown) => unknown) => {
        if (table === 'team_members') {
          const rows = TEAM_MEMBERS.filter((m) =>
            Object.entries(eqs).every(([k, v]) => (m as Record<string, unknown>)[k] === v) &&
            Object.entries(neqs).every(([k, v]) => (m as Record<string, unknown>)[k] !== v) &&
            (inIds === null || inIds.includes(m.id)))
          return Promise.resolve({ data: rows, error: null }).then(onFulfilled)
        }
        return Promise.resolve(resolveSession()).then(onFulfilled)
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { PATCH } from './route'

const params = { params: Promise.resolve({ id: 'job-1', sessionId: 'session-1' }) }
function req(body: Record<string, unknown>): Request {
  return new Request('https://app.fullloop.example/api/jobs/job-1/sessions/session-1', { method: 'PATCH', body: JSON.stringify(body) })
}

beforeEach(() => {
  sessionsStore[0].start_time = '2026-08-01T10:00:00Z'
  sessionsStore[0].end_time = '2026-08-01T12:00:00Z'
  sessionsStore[0].team_member_id = 'tm-1'
  sessionsStore[0].notes = null
  findSchedulingConflicts.mockReset()
  findSchedulingConflicts.mockResolvedValue([])
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] — excludes inactive team members from reassignment', () => {
  it('drops an inactive team_member_id instead of planting it back as lead', async () => {
    const res = await PATCH(req({ team_member_id: 'tm-inactive' }), params)
    expect(res.status).toBe(200)
    expect(sessionsStore[0].team_member_id).toBe(null)
  })

  it('still reassigns an active team_member_id', async () => {
    const res = await PATCH(req({ team_member_id: 'tm-active' }), params)
    expect(res.status).toBe(200)
    expect(sessionsStore[0].team_member_id).toBe('tm-active')
  })

  it('excludes a terminated member still listed in a saved crew from the assignee set', async () => {
    const res = await PATCH(req({ crew_id: 'crew-1' }), params)
    expect(res.status).toBe(200)
    expect(sessionsStore[0].team_member_id).toBe('tm-active')
  })
})
