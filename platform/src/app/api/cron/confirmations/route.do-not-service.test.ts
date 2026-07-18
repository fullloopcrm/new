import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * The client day-before confirmation SMS in GET /api/cron/confirmations
 * texted the client directly with no sms_consent or do_not_service check --
 * the same class fixed for the booking-lifecycle SMS pipeline this session
 * (89c2cdd9/14fa0888). A client who'd replied STOP, or one flagged
 * do_not_service, still got the "confirming your appointment tomorrow" text.
 * (The team-member confirm-request SMS in the same file is operational and
 * intentionally left ungated, same convention as the other crons.)
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  {
    id: 'bk-dns', tenant_id: TENANT, status: 'scheduled', client_id: 'client-dns', team_member_id: 'tm-1',
    start_time: '2026-01-06T14:00:00', service_type: 'Standard Clean',
    clients: { name: 'DNS Dana', phone: '+15559990001', sms_consent: true, do_not_service: true },
    team_members: { name: 'Cleaner Chris' },
  },
  {
    id: 'bk-ok', tenant_id: TENANT, status: 'scheduled', client_id: 'client-ok', team_member_id: 'tm-2',
    start_time: '2026-01-06T15:00:00', service_type: 'Standard Clean',
    clients: { name: 'OK Olivia', phone: '+15559990002', sms_consent: true, do_not_service: false },
    team_members: { name: 'Cleaner Cara' },
  },
]

const notifications: Row[] = []
const tenants: Row[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: 'key', telnyx_phone: '+15550000000', status: 'active' },
]

const sentSms: Row[] = []
const notificationInserts: Row[] = []

vi.mock('@/lib/secret-compare', () => ({ safeEqual: () => true }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Row) => { sentSms.push(args); return {} }) }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({ comms: { confirmation_reminder: { sms: true } }, timing: {} }),
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      is: (col: string, val: unknown) => { filters.push({ col, op: 'is', val }); return c },
      not: () => c,
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      order: () => c,
      returns: () => c,
      single: () => {
        const rows = applyFilters()
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      },
      limit: () => c,
      insert: (row: Row) => {
        if (table === 'notifications') notificationInserts.push(row)
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => unknown) => {
        const rows = applyFilters()
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve)
      },
    }
    function applyFilters() {
      const source = table === 'tenants' ? tenants : table === 'bookings' ? bookings : table === 'notifications' ? notifications : []
      return source.filter((row) =>
        filters.every((f) => {
          const rowVal = row[f.col]
          if (f.op === 'eq') return rowVal === f.val
          if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
          if (f.op === 'is') return rowVal === f.val
          if (f.op === 'gte') return rowVal != null && String(rowVal) >= String(f.val)
          if (f.op === 'lte') return rowVal != null && String(rowVal) <= String(f.val)
          return true
        }),
      )
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

import { GET } from './route'

describe('GET /api/cron/confirmations — do_not_service / sms_consent gate on client day-before SMS', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    sentSms.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T18:00:00.000Z')) // 1pm EST Jan 5
    process.env.CRON_SECRET = 'test-secret'
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not text a client flagged do_not_service, but still texts an eligible client', async () => {
    await GET(new Request('https://app.fullloop.example/api/cron/confirmations', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    const texted = sentSms.map((s) => s.to)
    expect(texted).not.toContain('+15559990001')
    expect(texted).toContain('+15559990002')
  })
})
