import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The client-facing reschedule confirmation email built an inline HTML
 * template with `tenant.name` spliced in raw (no escapeHtml import at all
 * in this file). tenant.name is tenant-owner-controlled (dashboard
 * onboarding), so a malicious tenant could set their business name to an
 * HTML/script payload and it would execute in every client's mail client
 * on every reschedule. Same class already fixed elsewhere this session for
 * campaign sends and shared email-template builders — this file was missed.
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

const maliciousTenantName = '<img src=x onerror=alert(1)>'
const tenantCtx: Row = {
  id: TENANT_A,
  name: maliciousTenantName,
  timezone: 'America/New_York',
  resend_api_key: 'key-abc',
  email_from: 'ops@tenant-a.test',
}
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async (_t: string, clientId?: string) => ({ clientId }) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

let lastEmailHtml = ''
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (args: { html: string }) => {
    lastEmailHtml = args.html
  }),
}))

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
  lastEmailHtml = ''
})

describe('PUT /api/client/reschedule/[id] — HTML injection via tenant.name', () => {
  it('escapes an HTML-bearing tenant.name in the client reschedule-confirmation email', async () => {
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

    expect(lastEmailHtml).not.toContain(maliciousTenantName)
    expect(lastEmailHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
