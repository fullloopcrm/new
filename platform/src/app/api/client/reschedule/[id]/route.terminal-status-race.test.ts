import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 follow-up to route.terminal-status.test.ts: that test proves the
 * pre-check rejects a reschedule when the SELECT snapshot already shows a
 * terminal status. It does NOT prove anything about a concurrent write
 * landing in the gap between that SELECT and this route's own UPDATE -- a
 * status flip (checkout, cron auto-complete, no-show) happening in that gap
 * would, with only a pre-check and no conditional WHERE on the write itself,
 * still let the reschedule through and silently corrupt an already-settled
 * booking's timestamps.
 *
 * Simulates the race organically: the pre-check SELECT reads 'scheduled'
 * and passes, then the mocked rateLimitDb call (which the real route awaits
 * AFTER the pre-check but BEFORE the update) flips the row to 'completed' as
 * a side effect -- standing in for a concurrent checkout/auto-complete
 * landing in that exact gap. Proves the UPDATE's own
 * `.not('status','in',...)` guard, not just the earlier SELECT-based
 * pre-check, is what actually stops the write.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let mode: 'select' | 'update' | 'insert' = 'select'
  let payload: Row = {}
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    update: (p: Row) => { mode = 'update'; payload = p; return c },
    insert: (p: Row) => { mode = 'insert'; payload = p; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    not: (col: string, op: string, val: string) => {
      if (op === 'in') {
        const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim())
        filters.push((r) => !list.includes(r[col] as string))
      }
      return c
    },
    single: async () => {
      if (mode === 'update') {
        const rows = matched()
        rows.forEach((r) => Object.assign(r, payload))
        return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'not found' } }
      }
      const m = matched()
      return m[0] ? { data: m[0], error: null } : { data: null, error: { message: 'not found' } }
    },
    maybeSingle: async () => {
      if (mode === 'update') {
        const rows = matched()
        rows.forEach((r) => Object.assign(r, payload))
        return { data: rows[0] ?? null, error: null }
      }
      const m = matched()
      return { data: m[0] ?? null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      if (mode === 'insert') {
        rowsOf().push({ ...payload })
        return resolve({ data: null, error: null })
      }
      return resolve({ data: matched(), error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: { value: Row } = { value: { id: TENANT_A, name: 'Tenant A', timezone: 'America/New_York' } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async (_t: string, clientId?: string) => ({ clientId }) }))

// Stands in for the concurrent write: fires AFTER the route's pre-check read
// but BEFORE its update, exactly the gap a real concurrent transition would
// land in.
const raceFlip = { enabled: false }
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => {
    if (raceFlip.enabled) {
      const row = DB.bookings?.find((r) => r.id === 'bk-race')
      if (row) row.status = 'completed'
    }
    return { allowed: true, remaining: 1 }
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

import { PUT } from './route'

beforeEach(() => {
  DB.bookings = []
  tenantCtx.value = { id: TENANT_A, name: 'Tenant A', timezone: 'America/New_York' }
  raceFlip.enabled = false
})

function req(body: Record<string, unknown>): Request {
  return new Request('https://x', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/client/reschedule/[id] — atomic terminal-status race', () => {
  it('409s instead of silently overwriting when the booking completes between the pre-check read and the write', async () => {
    DB.bookings.push({ id: 'bk-race', tenant_id: TENANT_A, client_id: 'c-1', status: 'scheduled', start_time: '2099-01-01T10:00:00Z' })
    raceFlip.enabled = true

    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z' }), { params: Promise.resolve({ id: 'bk-race' }) })

    expect(res.status).toBe(409)
    expect(DB.bookings.find((r) => r.id === 'bk-race')?.start_time).toBe('2099-01-01T10:00:00Z')
  })

  it('control: still succeeds when nothing races', async () => {
    DB.bookings.push({ id: 'bk-norace', tenant_id: TENANT_A, client_id: 'c-1', status: 'scheduled', start_time: '2099-01-01T10:00:00Z' })
    raceFlip.enabled = false

    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z' }), { params: Promise.resolve({ id: 'bk-norace' }) })

    expect(res.status).toBe(200)
    expect(DB.bookings.find((r) => r.id === 'bk-norace')?.start_time).toBe('2099-02-01T10:00:00Z')
  })
})
