import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 follow-up probe for the tenantDb() conversion of the `email_logs` insert
 * in PUT /api/client/reschedule/[id]. The prior code set `tenant_id: tenant.id`
 * manually in the insert payload; the conversion drops that explicit field and
 * relies on tenantDb()'s auto-stamp instead (see src/lib/tenant-db.ts `stamp()`).
 * This does NOT mock '@/lib/tenant-db' — the real wrapper runs against the fake
 * supabaseAdmin below, so it fails if the stamp is ever dropped or bypassed.
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

const tenantCtx: Row = {
  id: TENANT_A, name: 'Tenant A', timezone: 'America/New_York', resend_api_key: 'key-abc', email_from: 'ops@tenant-a.test',
}
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async (_t: string, clientId?: string) => ({ clientId }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

import { PUT } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://x', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// The email fan-out is fired without awaiting (`void (async () => {...})()`),
// so tests must flush microtasks before asserting on its side effects.
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  DB.bookings = []
  DB.email_logs = []
})

describe('PUT /api/client/reschedule/[id] — email_logs tenant_id stamp', () => {
  it('stamps tenant_id onto the email_logs row via tenantDb(), even with no explicit tenant_id in the payload', async () => {
    DB.bookings.push({
      id: 'bk-1',
      tenant_id: TENANT_A,
      client_id: 'c-1',
      start_time: '2099-01-01T10:00:00Z',
      clients: { email: 'client@example.com', name: 'Client One' },
    })

    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z' }), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)

    await flush()

    expect(DB.email_logs).toHaveLength(1)
    expect(DB.email_logs[0].tenant_id).toBe(TENANT_A)
    expect(DB.email_logs[0].email_type).toBe('client_reschedule')
    expect(DB.email_logs[0].recipient).toBe('client@example.com')
  })
})
