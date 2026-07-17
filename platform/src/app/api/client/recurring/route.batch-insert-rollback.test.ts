import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/recurring created the `recurring_schedules` row, then
 * batch-inserted the first weeks of `bookings`. It DID check the insert's
 * error (unlike the sibling plain `/api/schedules` route), but returned 500
 * without rolling back the just-created schedule row -- same orphaned
 * 'active'-schedule-with-zero-bookings failure mode already fixed on
 * admin/recurring-schedules, sale-to-recurring.ts, and (this pass) the plain
 * schedules route (5b173982).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CLIENT_A = 'client-mine'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let failBookingsInsert = false

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let insertRows: Row[] | null = null
  let deleteMode = false
  let countMode = false
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))

  function applyInsert(): Row[] | null {
    if (!insertRows) return null
    const created = insertRows.map((row, i) => ({ id: `new-${table}-${rowsOf().length + i + 1}`, ...row }))
    DB[table] = [...rowsOf(), ...created]
    return created
  }

  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count) countMode = true
      return c
    },
    insert: (rows: Row | Row[]) => { insertRows = Array.isArray(rows) ? rows : [rows]; return c },
    upsert: (rows: Row | Row[]) => { insertRows = Array.isArray(rows) ? rows : [rows]; return c },
    update: () => c,
    delete: () => { deleteMode = true; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: () => c,
    limit: () => c,
    maybeSingle: async () => ({ data: applyInsert()?.[0] ?? matched()[0] ?? null, error: null }),
    single: async () => ({ data: applyInsert()?.[0] ?? matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; count?: number; error: unknown }) => unknown) => {
      if (deleteMode) {
        DB[table] = rowsOf().filter((r) => !filters.every((f) => f(r)))
        return resolve({ data: null, error: null })
      }
      if (countMode) return resolve({ data: null, count: matched().length, error: null })
      if (insertRows && table === 'bookings' && failBookingsInsert) {
        return resolve({ data: null, error: { message: 'duplicate key value violates unique constraint' } })
      }
      const created = applyInsert()
      return resolve({ data: created ?? matched(), error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: TENANT_A }) }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async () => ({ clientId: CLIENT_A }) }))
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok123' }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientEmail: async () => {}, sendClientSMS: async () => {} }))
vi.mock('@/lib/messaging/client-email', () => ({ confirmationEmailFor: async () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'msg' }) }))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('https://x', { method: 'POST', body: JSON.stringify(body) })
}

const base = { client_id: CLIENT_A, frequency: 'weekly', start_date: '2099-01-05', time: '10:00', hours: 2 }

beforeEach(() => {
  DB.team_members = []
  DB.bookings = []
  DB.recurring_schedules = []
  DB.clients = []
  DB.booking_team_members = []
  failBookingsInsert = false
})

describe('POST /api/client/recurring — bookings batch-insert failure rollback', () => {
  it('does not leave an orphaned schedule when the bookings insert fails', async () => {
    DB.bookings.push({ id: 'bk-prior', tenant_id: TENANT_A, client_id: CLIENT_A, status: 'completed' })
    failBookingsInsert = true

    const res = await POST(req(base))
    expect(res.status).toBe(500)
    expect(DB.recurring_schedules).toHaveLength(0)
  })

  it('control: succeeds with a real schedule + bookings when the insert does not fail', async () => {
    DB.bookings.push({ id: 'bk-prior', tenant_id: TENANT_A, client_id: CLIENT_A, status: 'completed' })
    failBookingsInsert = false

    const res = await POST(req(base))
    expect(res.status).toBe(200)
    expect(DB.recurring_schedules).toHaveLength(1)
  })
})
