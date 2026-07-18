/**
 * GET /api/cron/daily-summary — recurring-expiration warning was scoped to
 * the whole tenant instead of the schedule, and raced besides.
 *
 * The old dedup checked `notifications` for ANY `type = 'recurring_expiring'`
 * row created for the tenant in the last 7 days -- not scoped to which
 * schedule the warning was for. One schedule's warning silently suppressed
 * every OTHER schedule's warning for 7 days (reproduces single-threaded, not
 * just under a race), and the check-then-insert shape also raced two
 * overlapping invocations into a double-send for the same schedule.
 *
 * Fix: a dedicated `recurring_schedules.expiring_last_notified_at` column,
 * claimed via compare-and-swap (< now - 7 days) BEFORE notify(), scoped
 * per-schedule. See 2026_07_17_recurring_schedules_expiring_notified_at.sql.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { GET } from './route'
import { notify } from '@/lib/notify'

function req(): Request {
  return new Request('http://localhost/api/cron/daily-summary', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const NOW = new Date('2026-07-16T08:00:00.000Z')
const inDays = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  vi.mocked(notify).mockClear()
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'k', status: 'active' }],
    team_members: [],
    bookings: [
      { id: 'book-1', schedule_id: 'sched-1', status: 'confirmed', start_time: inDays(10) },
      { id: 'book-2', schedule_id: 'sched-2', status: 'confirmed', start_time: inDays(12) },
    ],
    recurring_schedules: [
      { id: 'sched-1', tenant_id: 'tenant-A', client_id: 'client-1', recurring_type: 'weekly', status: 'active', clients: { name: 'Jane Client' }, expiring_last_notified_at: '1970-01-01T00:00:00.000Z' },
      { id: 'sched-2', tenant_id: 'tenant-A', client_id: 'client-2', recurring_type: 'weekly', status: 'active', clients: { name: 'John Client' }, expiring_last_notified_at: '1970-01-01T00:00:00.000Z' },
    ],
    notifications: [],
  }
})

describe('GET /api/cron/daily-summary — recurring expiration warning scoping + race', () => {
  it('warns for EVERY expiring schedule in a tenant, not just the first', async () => {
    await GET(req() as never)

    const expiringCalls = vi.mocked(notify).mock.calls.filter(([arg]) => arg.type === 'booking_reminder')
    expect(expiringCalls).toHaveLength(2)
    expect(h.store.notifications.filter((n) => n.type === 'recurring_expiring')).toHaveLength(2)
  })

  it('claims expiring_last_notified_at BEFORE calling notify, not after', async () => {
    let claimedAtSendTime: unknown = 'not-yet-checked'
    vi.mocked(notify).mockImplementation(async (arg) => {
      if (arg.type === 'booking_reminder' && claimedAtSendTime === 'not-yet-checked') {
        const sched = h.store.recurring_schedules.find((s) => s.id === 'sched-1')
        claimedAtSendTime = sched?.expiring_last_notified_at
      }
      return { success: true }
    })

    await GET(req() as never)

    expect(claimedAtSendTime).toBe(NOW.toISOString())
  })

  it('does not re-warn the same schedule within 7 days of its last warning', async () => {
    h.store.recurring_schedules[0].expiring_last_notified_at = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

    await GET(req() as never)

    const expiringCalls = vi.mocked(notify).mock.calls.filter(([arg]) => arg.type === 'booking_reminder')
    // Only sched-2 (never notified) warns; sched-1 was warned 3 days ago.
    expect(expiringCalls).toHaveLength(1)
  })

  it('re-warns a schedule once its last warning is more than 7 days old', async () => {
    h.store.recurring_schedules[0].expiring_last_notified_at = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()

    await GET(req() as never)

    const expiringCalls = vi.mocked(notify).mock.calls.filter(([arg]) => arg.type === 'booking_reminder')
    expect(expiringCalls).toHaveLength(2)
  })
})
