import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/client/recurring.
 * The team_members validity check and the repeat-client (prior completed
 * booking) count used manual .eq('tenant_id', tenantId) filters — a dropped
 * filter would let a client bind another tenant's cleaner to their recurring
 * schedule, or count a foreign tenant's completed bookings toward the
 * repeat-client gate.
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

describe('POST /api/client/recurring — tenantDb scoping', () => {
  it('REJECTS a cleaner_id that only exists in another tenant', async () => {
    DB.team_members.push({ id: 'tm-foreign', tenant_id: TENANT_B, name: 'Evil' })
    DB.bookings.push({ id: 'bk-prior', tenant_id: TENANT_A, client_id: CLIENT_A, status: 'completed' })

    const res = await POST(req({ ...base, cleaner_id: 'tm-foreign' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Cleaner not available')
  })

  it("does not count a foreign tenant's completed bookings toward the repeat-client gate", async () => {
    DB.bookings.push({ id: 'bk-foreign', tenant_id: TENANT_B, client_id: CLIENT_A, status: 'completed' })

    const res = await POST(req(base))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/first completed cleaning/)
  })

  it('ALLOWS an own-tenant cleaner_id with a real prior completed booking (schedule created)', async () => {
    DB.team_members.push({ id: 'tm-mine', tenant_id: TENANT_A, name: 'Alice' })
    DB.bookings.push({ id: 'bk-prior', tenant_id: TENANT_A, client_id: CLIENT_A, status: 'completed' })

    const res = await POST(req({ ...base, cleaner_id: 'tm-mine' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.bookings_created).toBeGreaterThan(0)
    expect(DB.recurring_schedules).toHaveLength(1)
  })
})
