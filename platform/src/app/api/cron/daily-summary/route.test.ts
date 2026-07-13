import { describe, it, expect, beforeEach, vi } from 'vitest'

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
let latestBookingByScheduleId: Record<string, { start_time: string } | null>
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
        const fixture = latestBookingByScheduleId[eqs.schedule_id as string]
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
  process.env.CRON_SECRET = 'test-secret'
  insertedNotifications.length = 0
  const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days out, within 30-day window
  tenantsRows = [{ id: NYCMAID_TENANT_ID, name: 'The NYC Maid', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null }]
  schedulesRows = [
    { id: 'sched-alice', client_id: 'c-alice', recurring_type: 'weekly', clients: { name: 'Alice' } },
    { id: 'sched-bob', client_id: 'c-bob', recurring_type: 'biweekly', clients: { name: 'Bob' } },
  ]
  latestBookingByScheduleId = {
    'sched-alice': { start_time: soon },
    'sched-bob': { start_time: soon },
  }
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
