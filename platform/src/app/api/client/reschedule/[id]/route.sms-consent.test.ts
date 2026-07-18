import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/client/reschedule/[id] sent the client reschedule SMS via a raw
 * sendSMS() call with no sms_consent check — unlike payment-processor.ts/
 * notify-team.ts, which gate SMS on `sms_consent !== false`. The team-member
 * reschedule notification (item 4, notifyTeamMember) already gates consent
 * internally, so only the client-facing SMS here needed the fix.
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

const tenantCtx: Row = { id: TENANT_A, name: 'Tenant A', timezone: 'America/New_York', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async (_t: string, clientId?: string) => ({ clientId }) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
const { sendSMS } = vi.hoisted(() => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
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

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  DB.bookings = []
  DB.email_logs = []
  sendSMS.mockClear()
})

describe('PUT /api/client/reschedule/[id] — sms_consent gate', () => {
  it('does not SMS the client when sms_consent is false', async () => {
    DB.bookings.push({
      id: 'bk-1', tenant_id: TENANT_A, client_id: 'c-1', start_time: '2099-01-01T10:00:00Z',
      clients: { phone: '+15551110000', name: 'Client', sms_consent: false },
    })
    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z' }), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
    await flush()
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS the client on reschedule when consented', async () => {
    DB.bookings.push({
      id: 'bk-1', tenant_id: TENANT_A, client_id: 'c-1', start_time: '2099-01-01T10:00:00Z',
      clients: { phone: '+15551110000', name: 'Client', sms_consent: true },
    })
    const res = await PUT(req({ start_time: '2099-02-01T10:00:00Z' }), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
    await flush()
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
