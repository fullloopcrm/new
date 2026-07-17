/**
 * GET /api/cron/follow-up — duplicate-send protection.
 *
 * Unlike every sibling follow-up cron (post-job-followup's [FOLLOWUP_SENT]
 * notes marker, sales-follow-ups' notifications-based dedup), this route had
 * ZERO guard against re-sending the 3-day "thank you + 10% off" email to a
 * booking it already followed up on -- a manual re-trigger of this endpoint,
 * or a platform-retried cron delivery, would re-notify every booking still
 * inside the 2-hour check_out_time window. Fix: a [THANKYOU_SENT] marker in
 * bookings.notes, checked before send and written after -- distinct from
 * post-job-followup's [FOLLOWUP_SENT] marker on the same column (that one
 * gates a different, earlier 2-hour-post-checkout SMS and would already be
 * present by the time this cron runs 3 days later).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

const TENANT_ID = 'tenant-fu1'

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null, notifyCalls: [] as unknown[] }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (args: unknown) => { h.notifyCalls.push(args); return { success: true } }),
}))

import { GET } from './route'

function cronReq() {
  return new Request('https://x.test/api/cron/follow-up', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

function checkoutThreeDaysAgo(): string {
  return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
}

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.notifyCalls = []
  h.fake = createFakeSupabase({
    tenants: [{ id: TENANT_ID, name: 'Test Tenant' }],
  })
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

describe('follow-up cron duplicate-send protection', () => {
  it('sends a thank-you exactly once per booking, skipping one already marked [THANKYOU_SENT]', async () => {
    h.fake!._seed('bookings', [
      { id: 'bk-fresh', tenant_id: TENANT_ID, client_id: 'client-1', service_type: 'Cleaning', status: 'completed', check_out_time: checkoutThreeDaysAgo(), notes: null, clients: { name: 'Jane' } },
      { id: 'bk-already-sent', tenant_id: TENANT_ID, client_id: 'client-2', service_type: 'Cleaning', status: 'completed', check_out_time: checkoutThreeDaysAgo(), notes: '[THANKYOU_SENT] 2026-07-14T00:00:00.000Z', clients: { name: 'Bob' } },
    ])

    const res = await GET(cronReq())
    const body = await res.json()

    expect(body.follow_ups_sent).toBe(1)
    expect(h.notifyCalls).toHaveLength(1)
    expect((h.notifyCalls[0] as { bookingId: string }).bookingId).toBe('bk-fresh')

    const updated = h.fake!._all('bookings').find((r) => r.id === 'bk-fresh')
    expect(String(updated?.notes)).toContain('[THANKYOU_SENT]')
  })

  it('does not send a second thank-you if the cron is re-triggered for the same booking', async () => {
    h.fake!._seed('bookings', [
      { id: 'bk-retrigger', tenant_id: TENANT_ID, client_id: 'client-3', service_type: 'Cleaning', status: 'completed', check_out_time: checkoutThreeDaysAgo(), notes: null, clients: { name: 'Ann' } },
    ])

    const first = await GET(cronReq())
    const firstBody = await first.json()
    expect(firstBody.follow_ups_sent).toBe(1)

    const second = await GET(cronReq())
    const secondBody = await second.json()
    expect(secondBody.follow_ups_sent).toBe(0)
    expect(h.notifyCalls).toHaveLength(1)
  })
})
