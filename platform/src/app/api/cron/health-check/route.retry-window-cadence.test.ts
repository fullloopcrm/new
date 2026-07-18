/**
 * GET /api/cron/health-check's failed-notification retry step queried
 * `.gte('created_at', oneHourAgo)` -- a 1-hour lookback. The file's own
 * docstring claims this cron "runs every 15 minutes," which is what that
 * window was sized for, but vercel.json actually schedules it once daily
 * (`0 12 * * *`). A notification that failed at any point outside the
 * ~1-hour window before that single daily run ages past `created_at >=
 * oneHourAgo` before the next run ever executes -- once its age crosses
 * one hour it can never re-enter a *backward-looking* "last hour" window,
 * so it's excluded forever. That's roughly 23 of every 24 hours' worth of
 * failures silently getting zero retry attempts, despite the retry_count<3
 * cap implying every failure gets up to three.
 *
 * Fix: widen the lookback to cover the actual daily cadence plus drift
 * margin, so a failure from any point in the last cron cycle is still
 * caught on the very next run.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/health-check', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const FIVE_HOURS_AGO = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
const TWENTY_SEVEN_HOURS_AGO = new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString()

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  h.seq = 0
  h.store = {
    tenants: [],
    notifications: [],
    bookings: [],
  }
})

describe('GET /api/cron/health-check — retry window matches actual daily cadence', () => {
  it('retries a notification that failed 5 hours ago (outside the old 1-hour window, inside a real daily gap)', async () => {
    h.store.notifications = [{
      id: 'n1', tenant_id: 'tenant-A', type: 'booking_reminder', title: 'Reminder',
      message: 'hi', channel: 'email', recipient_type: 'admin', recipient_id: null,
      booking_id: null, metadata: {}, retry_count: 0, status: 'failed',
      created_at: FIVE_HOURS_AGO,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    const row = h.store.notifications.find((n) => n.id === 'n1')!
    expect(row.status).toBe('retry_success')
    expect(row.retry_count).toBe(1)
    expect(json.fixes.join(' ')).toContain('Retried 1 failed notifications, 1 succeeded')
  })

  it('still leaves a 27-hour-old failure alone (window has a bound, does not retry indefinitely)', async () => {
    h.store.notifications = [{
      id: 'n2', tenant_id: 'tenant-A', type: 'booking_reminder', title: 'Reminder',
      message: 'hi', channel: 'email', recipient_type: 'admin', recipient_id: null,
      booking_id: null, metadata: {}, retry_count: 0, status: 'failed',
      created_at: TWENTY_SEVEN_HOURS_AGO,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    const row = h.store.notifications.find((n) => n.id === 'n2')!
    expect(row.status).toBe('failed')
    expect(row.retry_count).toBe(0)
    expect(json.fixes.join(' ')).not.toContain('Retried')
  })
})
