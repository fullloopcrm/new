import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * daily-summary cron — recurring-expiration dedup must be scoped per
 * client+recurring-type, not per tenant.
 *
 * Before this fix, the "already notified within 7 days" check filtered only
 * on `tenant_id` + `type='recurring_expiring'` — no client/schedule scope.
 * The first expiring schedule to fire in a tenant would suppress every OTHER
 * expiring schedule's warning for that tenant for a full week. nycmaid's
 * source scoped the dedup with `.like('message', '%client%type%')`; this
 * port restores that scoping.
 */

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async () => ({ success: true })),
}))
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async () => ({ success: true })),
}))
vi.mock('@/lib/sms-templates', () => ({
  smsDailySummary: vi.fn(() => 'summary'),
}))

let tenantsRows: Array<{ id: string; name: string; telnyx_api_key: string | null; telnyx_phone: string | null; resend_api_key: string | null }>
let schedulesRows: Array<{ id: string; client_id: string; recurring_type: string; clients: { name: string } }>
// Bookings fixtures, keyed by BOTH schedule_id and tenant_id — a poisoned
// cross-tenant row shares schedule_id with a legit tenant's schedule but
// must not be matched (see P38-class wrong-tenant probe below).
let bookingRows: Array<{ schedule_id: string; tenant_id: string; start_time: string }>
// Simulates rows already sitting in the DB from a prior cron run.
let seededNotifications: Array<{ tenant_id: string; type: string; message: string; created_at: string }>
const insertedNotifications: Array<Record<string, unknown>> = []

function likeMatches(message: string, pattern: string): boolean {
  // pattern like `%Alice%weekly%` -> both substrings must appear, in order is fine to ignore for this test
  const parts = pattern.split('%').filter(Boolean)
  return parts.every((p) => message.includes(p))
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let likePattern: string | null = null
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    not: () => chain,
    like: (_col: string, pattern: string) => {
      likePattern = pattern
      return chain
    },
    order: () => chain,
    limit: () => chain,
    returns: () => chain,
    insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      const arr = Array.isArray(rows) ? rows : [rows]
      insertedNotifications.push(...arr)
      return { then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) }
    },
    single: async () => {
      if (table === 'bookings') {
        // Faithful to the real query builder: a `.eq('tenant_id', …)` call
        // that's actually present in the chain narrows the match; if the
        // route regresses and drops that call, `tenant_id` never lands in
        // `eqs` and this mock — like real Postgres without the filter —
        // matches on schedule_id alone, across every tenant.
        const matches = bookingRows
          .filter((b) => b.schedule_id === eqs.schedule_id && ('tenant_id' in eqs ? b.tenant_id === eqs.tenant_id : true))
          .sort((a, b) => (a.start_time < b.start_time ? 1 : -1))
        const fixture = matches[0]
        return { data: fixture ?? null, error: fixture ? null : { code: 'PGRST116' } }
      }
      return { data: null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown; count?: number }) => void) => {
      if (table === 'tenants') return resolve({ data: tenantsRows, error: null })
      if (table === 'team_members') return resolve({ data: [], error: null, count: 0 })
      if (table === 'recurring_schedules') return resolve({ data: schedulesRows, error: null })
      if (table === 'bookings') return resolve({ data: [], error: null, count: 0 })
      if (table === 'notifications') {
        // Faithful to the real pre-fix bug: base filter is tenant_id+type
        // ONLY (over-broad — matches ANY expiring notification for the
        // tenant). `.like()` narrows it to this specific client+type, which
        // is the fix. Without `.like()`, one schedule's notification wrongly
        // dedupes every other schedule in the same tenant.
        const matches = seededNotifications.filter(
          (n) =>
            n.tenant_id === eqs.tenant_id &&
            n.type === eqs.type &&
            (likePattern ? likeMatches(n.message, likePattern as string) : true)
        )
        return resolve({ data: matches, error: null })
      }
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/daily-summary', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  // The route now only processes a tenant when it's 8am in THAT tenant's own
  // timezone (fixture has no `timezone`, so it defaults to America/New_York)
  // — pin the clock so this test is deterministic regardless of real
  // wall-clock time when the suite runs. 2026-07-22T12:00:00Z = 8am EDT.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-22T12:00:00Z'))
  process.env.CRON_SECRET = 'test-secret'
  insertedNotifications.length = 0
  const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days out, within 30-day window
  tenantsRows = [{ id: NYCMAID_TENANT_ID, name: 'The NYC Maid', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null }]
  schedulesRows = [
    { id: 'sched-alice', client_id: 'c-alice', recurring_type: 'weekly', clients: { name: 'Alice' } },
    { id: 'sched-bob', client_id: 'c-bob', recurring_type: 'biweekly', clients: { name: 'Bob' } },
  ]
  bookingRows = [
    { schedule_id: 'sched-alice', tenant_id: NYCMAID_TENANT_ID, start_time: soon },
    { schedule_id: 'sched-bob', tenant_id: NYCMAID_TENANT_ID, start_time: soon },
  ]
})

afterEach(() => {
  vi.useRealTimers()
})

describe('daily-summary cron — recurring_expiring dedup scope', () => {
  it('does not suppress Bob\'s expiring warning just because Alice\'s already fired this week', async () => {
    seededNotifications = [
      {
        tenant_id: NYCMAID_TENANT_ID,
        type: 'recurring_expiring',
        message: 'Alice — weekly ends Jul 23, 2026',
        created_at: new Date().toISOString(),
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()

    // Alice is deduped (already notified); Bob is NOT — a fresh warning fires.
    expect(body.details[0].expiring).toBe(1)
    const bobInserted = insertedNotifications.find(
      (n) => n.type === 'recurring_expiring' && String(n.message).includes('Bob')
    )
    expect(bobInserted).toBeTruthy()
    const aliceInserted = insertedNotifications.find(
      (n) => n.type === 'recurring_expiring' && String(n.message).includes('Alice')
    )
    expect(aliceInserted).toBeFalsy()
  })
})

describe('daily-summary cron — recurring-expiration lookup is tenant-scoped (P38-class)', () => {
  it('does not treat a foreign tenant\'s booking under the same schedule_id as this schedule\'s latest booking', async () => {
    // Alice's own tenant has NO booking for her schedule — only a
    // same-schedule_id row planted under a different tenant exists. Without
    // the tenant_id filter, the cron would pick that up as "the latest
    // booking" and fire an expiring warning derived from foreign data.
    schedulesRows = [
      { id: 'sched-alice', client_id: 'c-alice', recurring_type: 'weekly', clients: { name: 'Alice' } },
    ]
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    bookingRows = [
      { schedule_id: 'sched-alice', tenant_id: 'tenant-evil', start_time: soon },
    ]
    seededNotifications = []

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.details[0].expiring).toBe(0)
    const aliceInserted = insertedNotifications.find(
      (n) => n.type === 'recurring_expiring' && String(n.message).includes('Alice')
    )
    expect(aliceInserted).toBeFalsy()
  })
})
