import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // route derives the start_time lower bound via toNaiveET(); pin server TZ for a deterministic test

/**
 * bookings.start_time is naive-ET (no tz). The lower bound used
 * `new Date().toISOString()` -- a real UTC instant. Postgres drops the tz
 * marker for a `timestamp without time zone` column, so the UTC clock digits
 * were read as if they were ET clock digits, shifting the bound LATER by the
 * EST/EDT offset. Net effect: any pending booking starting within the next
 * ~4-5h (ET) fell below the shifted bound and was silently excluded from the
 * confirmation-reminder query -- right when the reminder matters most (job
 * imminent, client still hasn't confirmed).
 *
 * Real time in this test: 2026-01-05T13:15:00Z = 8:15am EST. A pending
 * booking starting at 11:00am ET the same day (created well over 30 min ago)
 * is only 2h45m away -- inside the shifted-bound blind spot under the old
 * code, but must be found and reminded under the fix.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  {
    id: 'bk-imminent-pending',
    tenant_id: TENANT,
    status: 'pending',
    client_id: 'client-1',
    start_time: '2026-01-05T11:00:00', // naive ET -- 2h45m from fake "now"
    service_type: 'Cleaning',
    hourly_rate: 50,
    notes: null,
    created_at: '2026-01-05T10:00:00.000Z', // TIMESTAMPTZ, well over 30 min ago
    clients: { name: 'Jane Client', phone: '+15551112222' },
  },
]

const tenants: Row[] = [
  { id: TENANT, status: 'active' },
]

const smsSent: Row[] = []

vi.mock('@/lib/nycmaid/auth', () => ({ protectCronAPI: () => null }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: vi.fn(async (clientId: string, body: string, opts: Row) => { smsSent.push({ clientId, body, ...opts }) }),
}))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ confirmationReminder: () => 'confirmation reminder body' }),
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      limit: () => c,
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => unknown) => {
        const source = table === 'tenants' ? tenants : table === 'bookings' ? bookings : table === 'sms_logs' ? [] : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'gte') return rowVal != null && String(rowVal) >= String(f.val)
            if (f.op === 'lte') return rowVal != null && String(rowVal) <= String(f.val)
            return true
          }),
        )
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

import { GET } from './route'

describe('GET /api/cron/confirmation-reminder — start_time lower bound must be naive-ET, not real UTC instant', () => {
  beforeEach(() => {
    smsSent.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T13:15:00.000Z')) // 8:15am EST
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('finds and reminds a pending booking starting within the next ~4-5h (ET)', async () => {
    const res = await GET(new Request('http://x'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sent).toBe(1)
    expect(smsSent.length).toBe(1)
    expect(smsSent[0].clientId).toBe('client-1')
  })
})
