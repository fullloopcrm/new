import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/book is a PUBLIC, unauthenticated endpoint. body.client_id
 * comes straight from the caller's browser localStorage (see client
 * dashboards, e.g. src/app/site/book/dashboard/page.tsx) with no server-side
 * session binding -- so any anonymous visitor can set an arbitrary UUID there
 * via devtools. The route previously did a tenantDb()-scoped SELECT for the
 * do-not-service gate but silently treated "not found" (i.e. a foreign
 * tenant's client_id) as "not do-not-serviced" and proceeded to create a real
 * booking under it. GET /api/bookings joins clients(name, phone, address) and
 * client_properties(*), so a foreign client_id let an anonymous internet
 * visitor plant another tenant's customer PII onto THIS tenant's staff
 * dashboard via a fabricated booking (same class already fixed on every
 * staff-facing creation route this session, but here reachable with zero
 * authentication at all).
 */

const TENANT_A = 'aaaaaaaa-1111-2222-3333-444444444444'
const TENANT_B = 'bbbbbbbb-1111-2222-3333-444444444444'
const FOREIGN_CLIENT = 'ffffffff-2222-2222-2222-222222222222'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let genId = 0

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let mode: 'select' | 'update' | 'insert' = 'select'
  let updatePayload: Row = {}
  let insertedRows: Row[] = []
  const rowsOf = (): Row[] => (DB[table] ||= [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (rows: Row | Row[]) => { mode = 'insert'; insertedRows = Array.isArray(rows) ? rows : [rows]; return c },
    update: (payload: Row) => { mode = 'update'; updatePayload = payload; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    ilike: (col: string, val: unknown) => {
      const re = new RegExp(`^${String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      filters.push((r) => re.test(String(r[col] ?? '')))
      return c
    },
    is: (col: string, val: unknown) => { filters.push((r) => (r[col] ?? null) === val); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: () => c,
    limit: () => c,
    single: async () => {
      if (mode === 'insert') {
        const row = { id: `gen-${++genId}`, ...insertedRows[0] }
        rowsOf().push(row)
        return { data: row, error: null }
      }
      const m = matched()
      return m[0] ? { data: m[0], error: null } : { data: null, error: { message: 'not found' } }
    },
    maybeSingle: async () => {
      const m = matched()
      return { data: m[0] ?? null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown; count: number }) => unknown) => {
      if (mode === 'insert') {
        const rows = insertedRows.map((r) => ({ id: `gen-${++genId}`, ...r }))
        rowsOf().push(...rows)
        return resolve({ data: rows, error: null, count: rows.length })
      }
      if (mode === 'update') {
        const m = matched()
        m.forEach((r) => Object.assign(r, updatePayload))
        return resolve({ data: null, error: null, count: m.length })
      }
      const m = matched()
      return resolve({ data: m, error: null, count: m.length })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: { value: Row } = { value: {} }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/holidays', () => ({ isHoliday: () => null }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({ success: true }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({
  adminNewBookingRequestEmail: () => ({ subject: '', html: '' }),
  referralSignupNotifyEmail: () => ({ subject: '', html: '' }),
}))
vi.mock('@/lib/messaging/client-email', () => ({ bookingReceivedEmail: () => ({ subject: '', html: '' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ bookingReceived: () => '' }) }))
vi.mock('@/lib/attribution', () => ({ autoAttributeBooking: async () => {} }))
vi.mock('@/lib/client-properties', () => ({
  resolveProperty: async () => null,
  applyPropertyToBookingClient: () => {},
}))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))

import { POST } from './route'

function tenant(id: string): Row {
  return {
    id, name: 'Tenant', phone: '', industry: null,
    resend_api_key: null, telnyx_api_key: null, telnyx_phone: null,
    primary_color: null, logo_url: null, email_from: null,
  }
}

function bookRequest(body: Row): Request {
  return new Request('https://x/api/client/book', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  DB.clients = []
  DB.referrers = []
  DB.bookings = []
  DB.deals = []
  DB.email_logs = []
  genId = 0
  tenantCtx.value = tenant(TENANT_A)
})

describe('POST /api/client/book — public endpoint rejects a foreign client_id', () => {
  it('rejects a client_id belonging to a different tenant instead of silently booking under it', async () => {
    DB.clients.push({ id: FOREIGN_CLIENT, tenant_id: TENANT_B, do_not_service: false, name: 'Foreign Client', phone: '+15559998888', address: '1 Foreign St' })

    const res = await POST(bookRequest({
      client_id: FOREIGN_CLIENT,
      service_type: 'Standard Cleaning',
      date: '2026-08-14',
      time: '10:00 AM',
      estimated_hours: 2,
      recurring_type: 'none',
    }))

    expect(res.status).toBe(404)
    expect(DB.bookings.find((b) => b.client_id === FOREIGN_CLIENT)).toBeUndefined()
  })
})
