/**
 * POST /api/admin/recurring-schedules -- recurring_type 'custom' (BookingsAdmin's
 * "Custom..." repeat option) had nowhere to persist its chosen cadence.
 * cron/generate-recurring's refill has no client in the loop and needs a
 * stored interval to invent more dates via generateRecurringDates' 'custom'
 * case -- without it, every custom-interval series silently stopped
 * generating bookings forever once its initial batch ran out (see
 * 2026_07_17_recurring_schedules_custom_interval.sql). This route now
 * derives custom_interval_days from the gap between the first two computed
 * dates -- the same ground truth used to create the bookings themselves.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeSupabaseFake(h), supabase: makeSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))
vi.mock('@/lib/tokens', () => ({ generateToken: () => `tok-${(h.seq += 1)}` }))

import { POST } from './route'

const TENANT = 'tenant-A'

const req = (body: unknown) =>
  new Request('http://x/api/admin/recurring-schedules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.tenantId = TENANT
  h.seq = 0
  h.store = {
    clients: [{ id: 'client-A', tenant_id: TENANT, name: 'Acme Client' }],
    team_members: [],
    client_properties: [],
    recurring_schedules: [],
    bookings: [],
  }
})

describe('POST /api/admin/recurring-schedules -- custom_interval_days derivation', () => {
  it('derives the interval from the gap between the caller-supplied dates for recurring_type custom', async () => {
    const res = await POST(req({
      client_id: 'client-A',
      recurring_type: 'custom',
      start_date: '2026-08-03',
      preferred_time: '10:00',
      duration_hours: 3,
      dates: ['2026-08-03', '2026-08-13', '2026-08-23'], // 10-day cadence
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.schedule.custom_interval_days).toBe(10)
  })

  it('an explicit custom_interval_days in the body takes precedence over the derived gap', async () => {
    const res = await POST(req({
      client_id: 'client-A',
      recurring_type: 'custom',
      start_date: '2026-08-03',
      preferred_time: '10:00',
      duration_hours: 3,
      custom_interval_days: 5,
      dates: ['2026-08-03', '2026-08-13'], // would derive 10, but explicit wins
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.schedule.custom_interval_days).toBe(5)
  })

  it('stays null when recurring_type is custom but fewer than 2 dates are known (nothing to derive from, no guess)', async () => {
    const res = await POST(req({
      client_id: 'client-A',
      recurring_type: 'custom',
      start_date: '2026-08-03',
      preferred_time: '10:00',
      duration_hours: 3,
      // no `dates` -- server falls back to generateRecurringDates, which for
      // 'custom' with no interval known only ever emits the single anchor.
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.schedule.custom_interval_days).toBeNull()
  })

  it('stays null for every non-custom recurring_type (nothing to capture)', async () => {
    const res = await POST(req({
      client_id: 'client-A',
      recurring_type: 'weekly',
      start_date: '2026-08-03',
      preferred_time: '10:00',
      duration_hours: 3,
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.schedule.custom_interval_days).toBeNull()
  })
})
