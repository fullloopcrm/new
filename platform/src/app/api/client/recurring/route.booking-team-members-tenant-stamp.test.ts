import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 follow-up probe for the tenantDb() conversion of the `booking_team_members`
 * upsert in POST /api/client/recurring. The prior code built each row with an
 * explicit `tenant_id: tenantId` field and wrote via raw supabaseAdmin (flagged
 * "tenant-scope-ok" only because the (booking_id, team_member_id) unique
 * constraint already prevented collisions). The conversion drops the explicit
 * field and relies on tenantDb()'s auto-stamp instead. This does NOT mock
 * '@/lib/tenant-db' — the real wrapper runs against the fake supabaseAdmin
 * below, so it fails if the stamp is ever dropped or bypassed.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const CLIENT_A = 'client-mine'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let insertRows: Row[] | null = null
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
    delete: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: () => c,
    limit: () => c,
    maybeSingle: async () => ({ data: applyInsert()?.[0] ?? matched()[0] ?? null, error: null }),
    single: async () => ({ data: applyInsert()?.[0] ?? matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; count?: number; error: unknown }) => unknown) => {
      if (countMode) return resolve({ data: null, count: matched().length, error: null })
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
})

describe('POST /api/client/recurring — booking_team_members tenant_id stamp', () => {
  it('stamps tenant_id onto every booking_team_members row via tenantDb(), even with no explicit tenant_id in the payload', async () => {
    DB.team_members.push({ id: 'tm-mine', tenant_id: TENANT_A, name: 'Alice' })
    DB.bookings.push({ id: 'bk-prior', tenant_id: TENANT_A, client_id: CLIENT_A, status: 'completed' })

    const res = await POST(req({ ...base, cleaner_id: 'tm-mine' }))
    expect(res.status).toBe(200)

    expect(DB.booking_team_members.length).toBeGreaterThan(0)
    for (const row of DB.booking_team_members) {
      expect(row.tenant_id).toBe(TENANT_A)
      expect(row.tenant_id).not.toBe(TENANT_B)
    }
  })
})
