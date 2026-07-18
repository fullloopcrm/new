/**
 * GET /api/cron/generate-recurring -- the NYC-Maid-scoped auto-resume UPDATE
 * only carried `.eq('id', s.id)`, trusting the `resumable` SELECT's
 * status/paused_until snapshot instead of re-asserting either inside the
 * write. An admin re-pausing the same schedule with a NEW (later)
 * paused_until via POST /api/admin/recurring-schedules/[id]/pause in the gap
 * between the SELECT and this row's turn in the loop got silently
 * overwritten back to 'active', reactivating a schedule the admin just
 * explicitly extended.
 *
 * Fix: the UPDATE re-asserts `.eq('status', 'paused').lte('paused_until',
 * todayStr)` in its own WHERE, so a lost race is a no-op instead of a
 * clobber.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/generate-recurring', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const NOW = new Date('2026-07-17T18:00:00.000Z') // midday ET, well past any midnight boundary
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.seq = 0
  h.store = {
    recurring_schedules: [{
      id: 'sched-1', tenant_id: NYCMAID_TENANT_ID, status: 'paused',
      paused_until: '2026-07-16', duration_hours: 3, recurring_type: 'weekly',
      day_of_week: 5, team_member_id: null, property_id: null,
      service_type_id: null, client_id: 'client-1', hourly_rate: null,
      pay_rate: null, notes: null, special_instructions: null, preferred_time: null,
    }],
    bookings: [],
    recurring_exceptions: [],
    notifications: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/generate-recurring -- auto-resume claim-before-write race', () => {
  it('does NOT reactivate a schedule the admin re-paused (later paused_until) between the SELECT and the UPDATE', async () => {
    // `recurring_schedules` is read for the `resumable` candidates SELECT,
    // then again for that row's auto-resume UPDATE. Land the admin's
    // re-pause (POST .../pause extending paused_until) right before that
    // second access -- the exact gap the loop leaves open in production.
    let accessCount = 0
    const schedulesArray = h.store.recurring_schedules
    Object.defineProperty(h.store, 'recurring_schedules', {
      configurable: true,
      get() {
        accessCount++
        if (accessCount === 2) {
          const row = schedulesArray.find((s) => s.id === 'sched-1')!
          row.paused_until = '2026-08-01'
        }
        return schedulesArray
      },
    })

    await GET(req() as never)

    const schedule = schedulesArray.find((s) => s.id === 'sched-1')!
    expect(schedule.status).toBe('paused')
    expect(schedule.paused_until).toBe('2026-08-01')
  })

  it('still auto-resumes a schedule whose pause genuinely elapsed', async () => {
    await GET(req() as never)

    const schedule = h.store.recurring_schedules.find((s) => s.id === 'sched-1')!
    expect(schedule.status).toBe('active')
    expect(schedule.paused_until).toBeNull()
  })
})
