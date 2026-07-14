import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/client/book
 * (converted from raw `supabaseAdmin` + manual `.eq('tenant_id', …)` calls).
 * Unlike route.happy-path.test.ts (which asserts the mock recorded the right
 * `.eq('tenant_id', …)` argument), this test seeds a real two-tenant fake
 * Postgres and lets the chain actually FILTER by every applied predicate — so
 * it fails if the tenantDb() wrapper (or a future edit) stops appending the
 * tenant filter, not just if the call shape changes.
 *
 * Both scenarios reuse the same client/booking id across two tenants, the
 * way an attacker-supplied or coincidentally-colliding id would — proving
 * cross-tenant rows are invisible to the other tenant's booking flow even
 * when ids line up.
 */

const TENANT_A = 'aaaaaaaa-1111-2222-3333-444444444444'
const TENANT_B = 'bbbbbbbb-1111-2222-3333-444444444444'

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

describe('POST /api/client/book — cross-tenant isolation (tenantDb conversion)', () => {
  it('does not attach a referrer belonging to a different tenant, even on ref_code match', async () => {
    const CLIENT = '11111111-1111-1111-1111-111111111111'
    DB.clients.push({ id: CLIENT, tenant_id: TENANT_A, do_not_service: false })
    DB.referrers.push({ id: 'ref-foreign', tenant_id: TENANT_B, ref_code: 'SAVE10', active: true, name: 'Foreign Referrer', email: 'foreign@example.com' })

    const res = await POST(bookRequest({
      client_id: CLIENT,
      service_type: 'Standard Cleaning',
      date: '2026-08-14',
      time: '10:00 AM',
      estimated_hours: 2,
      price: 15000,
      recurring_type: 'none',
      ref_code: 'save10',
    }))

    expect(res.status).toBe(200)
    const booking = DB.bookings.find((b) => b.client_id === CLIENT)
    expect(booking?.referrer_id).toBeNull()
    // The foreign referrer's own row must be untouched (no accidental attach).
    expect(DB.referrers[0].tenant_id).toBe(TENANT_B)
  })

  it('does not count a same-day booking belonging to a different tenant against the duplicate-booking gate', async () => {
    const CLIENT = '22222222-2222-2222-2222-222222222222'
    DB.clients.push({ id: CLIENT, tenant_id: TENANT_A, do_not_service: false })
    // A foreign tenant's booking for the SAME client id on the SAME date —
    // simulates an id collision/replay; must not block tenant A's own booking.
    DB.bookings.push({
      id: 'foreign-booking',
      tenant_id: TENANT_B,
      client_id: CLIENT,
      start_time: '2026-09-01T09:00:00',
      status: 'confirmed',
    })

    const res = await POST(bookRequest({
      client_id: CLIENT,
      service_type: 'Standard Cleaning',
      date: '2026-09-01',
      time: '11:00 AM',
      estimated_hours: 2,
      price: 15000,
      recurring_type: 'none',
    }))

    expect(res.status).toBe(200)
    const mine = DB.bookings.find((b) => b.tenant_id === TENANT_A && b.client_id === CLIENT)
    expect(mine).toBeTruthy()
  })
})
