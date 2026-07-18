/**
 * GET /api/cron/schedule-monitor — concurrent-invocation duplicate-issue race.
 *
 * The "Dedup + write" step at the bottom of the per-tenant loop is a plain
 * check-then-insert: SELECT every open/acknowledged schedule_issues message
 * for the tenant, filter `issues` down to ones not already in that set, then
 * INSERT each survivor — with no DB constraint behind the dedup. This cron
 * has maxDuration=300 and loops every active tenant sequentially inside one
 * invocation, exactly the shape this session has repeatedly found gets
 * retried by Vercel on a timeout. Two overlapping invocations racing the
 * same tenant can both read the same empty existingMessages set before
 * either insert lands, and both write the identical (tenant_id, message)
 * issue row — a duplicate row on the admin schedule-issues dashboard.
 *
 * Fix: a partial unique index on schedule_issues(tenant_id, message) WHERE
 * status IN ('open','acknowledged') (migration
 * 2026_07_17_schedule_issues_open_dedup_unique.sql) plus a 23505 catch on
 * the insert that treats the loser as an idempotent no-op — same pattern as
 * cron/comhub-email's 23505 handling on comhub_messages.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

const TENANT_ID = 'tenant-sm1'

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/schedule-monitor', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined
let savedTZ: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  savedTZ = process.env.TZ
  process.env.TZ = 'America/New_York'

  h.fake = createFakeSupabase({
    tenants: [{ id: TENANT_ID, name: 'Test Tenant', status: 'active' }],
    bookings: [{
      id: 'b1', tenant_id: TENANT_ID, client_id: 'client-1', status: 'scheduled',
      start_time: '2026-07-15T15:00:00', end_time: '2026-07-15T16:00:00',
      team_member_id: null, price: null, hourly_rate: null, notes: null,
      recurring_type: null, actual_hours: null,
      clients: { id: 'client-1', name: 'Jane Doe', address: null },
      team_members: null,
    }],
    schedule_issues: [],
  })
  // Models the partial unique index this fix adds — same shape as
  // comhub-email's race test, scoped to a single tenant here so a plain
  // single-column constraint on `message` correctly stands in for the real
  // composite (tenant_id, message) index.
  h.fake._addUniqueConstraint('schedule_issues', 'message')

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z')) // 2pm EDT, clear of any day-boundary risk
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
  if (savedTZ === undefined) delete process.env.TZ
  else process.env.TZ = savedTZ
  vi.useRealTimers()
})

describe('concurrent schedule-monitor invocations racing the same tenant', () => {
  it('writes exactly one schedule_issues row for the same unassigned-booking issue', async () => {
    const [first, second] = await Promise.all([GET(cronReq()), GET(cronReq())])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const rows = h.fake!._all('schedule_issues').filter((r) => r.type === 'unassigned' && (r.booking_ids as string[]).includes('b1'))
    expect(rows).toHaveLength(1)

    const firstJson = await first.json()
    const secondJson = await second.json()
    // Total new_issues reported across both invocations should sum to 1 —
    // the loser's insert lost the race and must not double-count itself.
    expect(firstJson.new_issues + secondJson.new_issues).toBe(1)
  })
})
