import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/bookings/[id]/status is the dedicated booking state machine --
 * several other routes' comments point to it as the authority that blocks
 * invalid transitions (e.g. completed can only advance to paid, never
 * cancelled). But `allowed = VALID_TRANSITIONS[booking.status]` was computed
 * from a plain SELECT snapshot taken before the write, and the write itself
 * carried no matching WHERE on that snapshot -- just `.eq('id', id).eq(
 * 'tenant_id', tenantId)`. A concurrent transition (another status change,
 * checkout, cron auto-complete) landing in the gap between the read and the
 * write would still let a stale-snapshot-approved transition overwrite the
 * row, even though it's no longer valid from the row's real current state --
 * same TOCTOU shape already fixed on the sibling PUT/reassign/reschedule
 * routes.
 *
 * Simulates the race organically: the booking SELECT resolves with the
 * snapshot taken 'scheduled' (so cancelling is allowed per VALID_TRANSITIONS),
 * but as a side effect of that same read resolving, the underlying row flips
 * to 'completed' in the store -- standing in for a concurrent transition
 * landing in the real gap between this route's read and its write.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const raceFlip = { enabled: false }

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let updatePayload: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    update: (payload: Row) => { updatePayload = payload; return c },
    single: () => {
      const m = rowsOf().filter((r) => filters.every((f) => f(r)))
      const row = m[0]
      if (!row) return Promise.resolve({ data: null, error: null })
      const snapshot = { ...row }
      if (raceFlip.enabled && table === 'bookings' && row.status === 'scheduled') row.status = 'completed'
      return Promise.resolve({ data: snapshot, error: null })
    },
    maybeSingle: () => {
      const matched = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (updatePayload) matched.forEach((r) => Object.assign(r, updatePayload))
      return Promise.resolve({ data: matched[0] || null, error: null })
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      const matched = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (updatePayload) matched.forEach((r) => Object.assign(r, updatePayload))
      return Promise.resolve(res({ data: matched, error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'manager', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { PATCH } from './route'

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function req(body: unknown) {
  return new Request('http://test', { method: 'PATCH', body: JSON.stringify(body) })
}

beforeEach(() => {
  DB.bookings = [{ id: 'bk-race', tenant_id: TENANT_A, status: 'scheduled' }]
  DB.deals = []
  raceFlip.enabled = false
})

describe('PATCH /api/bookings/[id]/status — atomic terminal-status race', () => {
  it('409s and leaves the row untouched when the booking completes between the read and the write', async () => {
    raceFlip.enabled = true
    const res = await PATCH(req({ status: 'cancelled' }), params('bk-race'))
    expect(res.status).toBe(409)
    expect(DB.bookings[0].status).toBe('completed') // untouched by our cancel — only flipped by the simulated race
  })

  it('control: still succeeds when nothing races', async () => {
    raceFlip.enabled = false
    const res = await PATCH(req({ status: 'cancelled' }), params('bk-race'))
    expect(res.status).toBe(200)
    expect(DB.bookings[0].status).toBe('cancelled')
  })
})
