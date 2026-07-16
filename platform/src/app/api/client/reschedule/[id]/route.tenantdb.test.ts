import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of PUT
 * /api/client/reschedule/[id]. A fake PostgREST layer applies every `.eq`
 * predicate against a seeded two-tenant dataset, so a route that silently
 * reverted to unscoped supabaseAdmin would let a client reschedule (and
 * read the full client/team_member join for) a booking that belongs to a
 * different tenant, as long as the booking id was guessable.
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
    single: async () => {
      if (mode === 'update') {
        const rows = matched()
        rows.forEach((r) => Object.assign(r, payload))
        return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'not found' } }
      }
      const m = matched()
      return m[0] ? { data: m[0], error: null } : { data: null, error: { message: 'not found' } }
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
  DB.bookings = []
  tenantCtx.value = { id: TENANT_A, name: 'Tenant A', timezone: 'America/New_York' }
})

function req(body: Record<string, unknown>): Request {
  return new Request('https://x', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/client/reschedule/[id] — tenantDb scoping', () => {
  it('404s a booking id that belongs to a different tenant', async () => {
    DB.bookings.push({ id: 'bk-1', tenant_id: TENANT_B, client_id: 'c-1', start_time: '2099-01-01T10:00:00Z' })
    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z' }), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(404)
  })

  it('reschedules a booking that belongs to the caller tenant', async () => {
    DB.bookings.push({ id: 'bk-2', tenant_id: TENANT_A, client_id: 'c-1', start_time: '2099-01-01T10:00:00Z' })
    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z' }), { params: Promise.resolve({ id: 'bk-2' }) })
    expect(res.status).toBe(200)
    const body = await res.json() as Row
    expect(body.start_time).toBe('2099-02-01T10:00:00Z')
  })
})
