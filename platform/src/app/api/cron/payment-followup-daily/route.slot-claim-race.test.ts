import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/payment-followup-daily — per-slot idempotency TOCTOU.
 *
 * The "already texted this booking this slot" guard used to be a plain
 * SELECT-count-then-INSERT against sms_logs with no unique constraint
 * behind it: two overlapping/retried cron invocations (a Vercel cron
 * double-fire, a manual ?force=1 retry racing the scheduled run) could both
 * pass the count check before either INSERT landed, texting the client
 * twice for the same slot. Fixed by claiming the slot via an INSERT into
 * sms_logs(booking_id, sms_type, slot_key) BEFORE sending — a real unique
 * index (migrations/2026_08_12_sms_logs_followup_slot_unique.sql) backs
 * that insert, so a losing claim gets a real 23505 instead of a false
 * "clear to send".
 *
 * This suite simulates the race the same way the referral-commissions
 * money-race tests do: pre-seed the "concurrent winner" claim row that
 * would exist if another invocation's insert landed first, and assert this
 * invocation's send is skipped rather than duplicated.
 */

type Row = Record<string, unknown>

const TENANT_ID = 'tenant-1'
const BOOKING_ID = 'booking-1'

// Any chained filter call (.eq/.not/.gt/.gte/.lt/.is/…) just returns another
// chainable proxy; awaiting the chain resolves to a fixed value. Good enough
// for tenants/bookings here since this suite seeds exactly what should come
// back and doesn't need real filter semantics for those two tables — the
// behavior under test is entirely in how the route reacts to sms_logs.
function chainable(resolveValue: unknown) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(resolveValue)
      return () => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

function makeSmsLogsTable(rows: Row[]) {
  return {
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      const filters: Record<string, unknown> = {}
      const chain = {
        eq(col: string, val: unknown) {
          filters[col] = val
          return chain
        },
        then(resolve: (v: unknown) => void) {
          const matched = rows.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v))
          resolve(opts?.head ? { count: matched.length, data: null, error: null } : { data: matched, error: null })
        },
      }
      return chain
    },
    insert(payload: Row) {
      // Mirrors the partial unique index on
      // sms_logs(booking_id, sms_type, slot_key) WHERE slot_key IS NOT NULL.
      const dup = rows.find(
        (r) =>
          r.booking_id === payload.booking_id &&
          r.sms_type === payload.sms_type &&
          payload.slot_key != null &&
          r.slot_key === payload.slot_key,
      )
      if (dup) {
        return Promise.resolve({
          data: null,
          error: { message: 'duplicate key value violates unique constraint on sms_logs', code: '23505' },
        })
      }
      const row = { id: `sms-${rows.length + 1}`, created_at: '2026-08-12T12:00:00.000Z', ...payload }
      rows.push(row)
      return Promise.resolve({ data: [row], error: null })
    },
    delete() {
      const filters: Record<string, unknown> = {}
      const chain = {
        eq(col: string, val: unknown) {
          filters[col] = val
          return chain
        },
        then(resolve: (v: unknown) => void) {
          const removed = rows.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v))
          for (const r of removed) rows.splice(rows.indexOf(r), 1)
          resolve({ data: removed, error: null })
        },
      }
      return chain
    },
  }
}

function makeFakeSupabase(state: { tenants: Row[]; bookings: Row[]; sms_logs: Row[] }) {
  return {
    from(table: string) {
      if (table === 'tenants') return chainable({ data: state.tenants, error: null })
      if (table === 'bookings') return chainable({ data: state.bookings, error: null })
      if (table === 'sms_logs') return makeSmsLogsTable(state.sms_logs)
      throw new Error(`route.slot-claim-race.test.ts fake: unexpected table ${table}`)
    },
  }
}

const state = vi.hoisted(() => ({
  tenants: [] as Row[],
  bookings: [] as Row[],
  sms_logs: [] as Row[],
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return makeFakeSupabase(state)
  },
}))
const sendSMS = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => true) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/payment-followup-daily', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  state.tenants = [
    {
      id: TENANT_ID,
      name: 'Test Tenant',
      telnyx_api_key: 'key',
      telnyx_phone: '+15551234567',
      payment_link: 'https://pay.example.com/link',
      owner_phone: null,
      phone: null,
      timezone: 'America/New_York',
    },
  ]
  state.bookings = [
    {
      id: BOOKING_ID,
      client_id: 'client-1',
      price: 10000,
      end_time: '2026-08-10T10:00:00',
      clients: { name: 'Jane Doe', phone: '+15559876543' },
    },
  ]
  state.sms_logs = []
  sendSMS.mockClear()
  // 2026-08-12T12:00:00Z is 8am America/New_York (EDT, UTC-4) -- one of the
  // route's SEND_SLOTS_LOCAL hours, so the run isn't skipped for wrong hour.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-12T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/cron/payment-followup-daily — per-slot claim race', () => {
  it('sends once and records a claim row with the slot key on a clean run', async () => {
    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tenants[0].sent).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(state.sms_logs).toHaveLength(1)
    expect(state.sms_logs[0]).toMatchObject({
      booking_id: BOOKING_ID,
      sms_type: 'payment_followup_daily',
      slot_key: '2026-08-12-8',
    })
  })

  it('a slot already claimed by a concurrent/retried invocation is skipped, not double-texted', async () => {
    // Simulates the exact race: another invocation's insert already landed
    // for this booking+slot before this invocation reached its own insert.
    state.sms_logs.push({
      id: 'sms-existing',
      tenant_id: TENANT_ID,
      booking_id: BOOKING_ID,
      sms_type: 'payment_followup_daily',
      slot_key: '2026-08-12-8',
      recipient: '+15559876543',
    })

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tenants[0].sent).toBe(0)
    expect(sendSMS).not.toHaveBeenCalled()
    // Still exactly one claim row for this booking+slot -- no duplicate landed.
    expect(state.sms_logs.filter((r) => r.booking_id === BOOKING_ID && r.slot_key === '2026-08-12-8')).toHaveLength(1)
  })

  it('reverts the claim when the SMS send itself fails, so a retry is not permanently blocked', async () => {
    sendSMS.mockRejectedValueOnce(new Error('telnyx down'))

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tenants[0].sent).toBe(0)
    // The claim row from the failed attempt was rolled back -- nothing left
    // blocking a later slot or a force-retry from re-attempting this booking.
    expect(state.sms_logs).toHaveLength(0)
  })
})
