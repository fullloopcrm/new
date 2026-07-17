import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 follow-up to route.terminal-status.test.ts: that test proves the
 * pre-check (reading a plain SELECT snapshot of oldBooking.status) rejects a
 * cancel/reschedule when the booking is ALREADY terminal at read time. It
 * does NOT prove anything about a concurrent write landing in the gap
 * between that SELECT and this route's own UPDATE -- a status flip
 * (checkout, cron auto-complete, no-show) happening in that exact gap would,
 * with only a pre-check and no conditional WHERE on the write itself, still
 * let the mutation through and silently corrupt an already-settled booking.
 *
 * Simulates the race organically: the oldBooking SELECT resolves with the
 * snapshot taken 'scheduled' (so the pre-check passes), but as a side effect
 * of that same read resolving, the underlying row flips to 'completed' in
 * the store -- standing in for a concurrent transition landing in the real
 * gap between this route's read and its write. Proves the UPDATE's own
 * `.not('status','in',...)` guard, not just the earlier pre-check, is what
 * actually stops the write.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const raceFlip = { enabled: false }

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    not: (col: string, op: string, val: string) => {
      if (op === 'in') {
        const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim())
        filters.push((r) => !list.includes(r[col] as string))
      }
      return uc
    },
    select: () => uc,
    single: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: null }
    },
    maybeSingle: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: null }
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => {
      const m = matched()
      const row = m[0]
      if (!row) return { data: null, error: null }
      // Snapshot BEFORE the race-flip side effect, mirroring a real SELECT
      // returning the value as of read time.
      const snapshot = { ...row }
      if (raceFlip.enabled && table === 'bookings') row.status = 'completed'
      return { data: snapshot, error: null }
    },
    update: (values: Row) => updateChain(rowsOf(), values),
    insert: (row: Row) => ({ then: (resolve: (v: unknown) => unknown) => { rowsOf().push({ id: `inserted-${rowsOf().length}`, ...row }); resolve({ data: null, error: null }) } }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { PUT } from './route'

beforeEach(() => {
  DB.bookings = [
    { id: 'bk-race', tenant_id: TENANT_A, client_id: 'client-1', team_member_id: null, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'scheduled' },
  ]
  raceFlip.enabled = false
})

function makeRequest(body: Record<string, unknown>) {
  const token = createToken('client-1', TENANT_A)
  return new NextRequest('https://x/api/portal/bookings/bk-race', {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/portal/bookings/[id] — atomic terminal-status race', () => {
  it('409s instead of silently cancelling when the booking completes between the pre-check read and the write', async () => {
    raceFlip.enabled = true
    const res = await PUT(makeRequest({ status: 'cancelled' }), { params: Promise.resolve({ id: 'bk-race' }) })
    expect(res.status).toBe(409)
    expect(DB.bookings[0].status).toBe('completed') // untouched by our cancel — only flipped by the simulated race
  })

  it('control: still succeeds when nothing races', async () => {
    raceFlip.enabled = false
    const res = await PUT(makeRequest({ status: 'cancelled' }), { params: Promise.resolve({ id: 'bk-race' }) })
    expect(res.status).toBe(200)
    expect(DB.bookings[0].status).toBe('cancelled')
  })
})
