import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/client/reschedule/[id] previously wrote `body.team_member_id`
 * verbatim into the booking with no check that it belonged to the tenant.
 * The response (and every later read) joins
 * team_members!bookings_team_member_id_fkey(*), so a foreign id let an
 * external CUSTOMER pull another tenant's staff member's full row (name,
 * phone, pay_rate) into their own reschedule response -- worse audience than
 * the staff-only leaks already fixed elsewhere this session.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

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
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

import { PUT } from './route'

beforeEach(() => {
  DB.bookings = [{ id: 'bk-1', tenant_id: TENANT_A, client_id: 'c-1', start_time: '2099-01-01T10:00:00Z' }]
  DB.team_members = [
    { id: 'tm-own', tenant_id: TENANT_A, name: 'Own Employee' },
    { id: 'tm-foreign', tenant_id: TENANT_B, name: 'Foreign Employee' },
  ]
  tenantCtx.value = { id: TENANT_A, name: 'Tenant A', timezone: 'America/New_York' }
})

function req(body: Record<string, unknown>): Request {
  return new Request('https://x', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/client/reschedule/[id] — team_member_id tenant scoping', () => {
  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z', team_member_id: 'tm-foreign' }), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(404)
    expect(DB.bookings.find((b) => b.id === 'bk-1')?.team_member_id).toBeUndefined()
  })

  it('accepts a team_member_id belonging to the caller tenant', async () => {
    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z', team_member_id: 'tm-own' }), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json() as Row
    expect(body.team_member_id).toBe('tm-own')
  })
})
