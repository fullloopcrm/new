import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/recurring writes booking_team_members (lead + extras) as a
 * best-effort follow-up after the bookings insert succeeds. A failure there
 * used to be swallowed with only a console.error -- but booking_team_members
 * is the ONLY record of non-lead extras (bookings.team_member_id carries just
 * the lead), and it feeds real downstream reads: closeout-summary's payout
 * breakdown, team-portal 15min-alert's visibility/authz for extras, and
 * smart-schedule's double-booking conflict check. A swallowed failure here
 * silently drops an extra from all three while the response still reports
 * success. Fix: also write a `team_sync_fail` notifications row so ops sees
 * it, same idiom already used for comms_fail (lib/nycmaid/sms.ts).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CLIENT_A = 'client-mine'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let failTeamUpsert = false

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let insertRows: Row[] | null = null
  let upsertMode = false
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
    upsert: (rows: Row | Row[]) => { insertRows = Array.isArray(rows) ? rows : [rows]; upsertMode = true; return c },
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
      if (upsertMode && table === 'booking_team_members' && failTeamUpsert) {
        return resolve({ data: null, error: { message: 'connection reset' } })
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
  DB.notifications = []
  failTeamUpsert = false
})

describe('POST /api/client/recurring — booking_team_members upsert failure', () => {
  it('writes a team_sync_fail notification instead of only console.error', async () => {
    DB.team_members.push({ id: 'tm-mine', tenant_id: TENANT_A, name: 'Alice' })
    DB.bookings.push({ id: 'bk-prior', tenant_id: TENANT_A, client_id: CLIENT_A, status: 'completed' })
    failTeamUpsert = true

    const res = await POST(req({ ...base, cleaner_id: 'tm-mine' }))

    // Response still reports success -- the bookings themselves are real and
    // shouldn't be rolled back over a best-effort sync failure.
    expect(res.status).toBe(200)
    expect(DB.booking_team_members).toHaveLength(0)

    const alerts = DB.notifications.filter((n) => n.type === 'team_sync_fail')
    expect(alerts).toHaveLength(1)
    expect(alerts[0].tenant_id).toBe(TENANT_A)
    expect(String(alerts[0].message)).toContain('booking_team_members')
  })

  it('control: no notification when the upsert succeeds', async () => {
    DB.team_members.push({ id: 'tm-mine', tenant_id: TENANT_A, name: 'Alice' })
    DB.bookings.push({ id: 'bk-prior', tenant_id: TENANT_A, client_id: CLIENT_A, status: 'completed' })
    failTeamUpsert = false

    const res = await POST(req({ ...base, cleaner_id: 'tm-mine' }))
    expect(res.status).toBe(200)
    expect(DB.booking_team_members.length).toBeGreaterThan(0)
    expect(DB.notifications.filter((n) => n.type === 'team_sync_fail')).toHaveLength(0)
  })
})
