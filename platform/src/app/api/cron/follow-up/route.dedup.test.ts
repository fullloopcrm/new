/**
 * GET /api/cron/follow-up — duplicate-send protection.
 *
 * thank_you_sent_at is the sole dedup source of truth (compare-and-swap,
 * claimed before send -- see route.claim-before-send-race.test.ts for the
 * concurrency coverage and the migration file for the full history). notes
 * still gets a human-readable [THANKYOU_SENT] marker in the same atomic
 * write, but it is cosmetic only and is never read back.
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
  it('sends a thank-you exactly once per booking, skipping one already marked via thank_you_sent_at', async () => {
    h.fake!._seed('bookings', [
      { id: 'bk-fresh', tenant_id: TENANT_ID, client_id: 'client-1', service_type: 'Cleaning', status: 'completed', check_out_time: checkoutThreeDaysAgo(), notes: null, thank_you_sent_at: null, clients: { name: 'Jane' } },
      { id: 'bk-already-sent', tenant_id: TENANT_ID, client_id: 'client-2', service_type: 'Cleaning', status: 'completed', check_out_time: checkoutThreeDaysAgo(), notes: '[THANKYOU_SENT] 2026-07-14T00:00:00.000Z', thank_you_sent_at: '2026-07-14T00:00:00.000Z', clients: { name: 'Bob' } },
    ])

    const res = await GET(cronReq())
    const body = await res.json()

    expect(body.follow_ups_sent).toBe(1)
    expect(h.notifyCalls).toHaveLength(1)
    expect((h.notifyCalls[0] as { bookingId: string }).bookingId).toBe('bk-fresh')

    const updated = h.fake!._all('bookings').find((r) => r.id === 'bk-fresh')
    expect(updated?.thank_you_sent_at).not.toBeNull()
    expect(String(updated?.notes)).toContain('[THANKYOU_SENT]')
  })

  it('does not resend after an admin PATCH overwrites notes and erases the marker text', async () => {
    h.fake!._seed('bookings', [
      { id: 'bk-notes-wiped', tenant_id: TENANT_ID, client_id: 'client-4', service_type: 'Cleaning', status: 'completed', check_out_time: checkoutThreeDaysAgo(), notes: null, thank_you_sent_at: null, clients: { name: 'Sam' } },
    ])

    const first = await GET(cronReq())
    expect((await first.json()).follow_ups_sent).toBe(1)

    // Simulate PATCH /api/bookings/:id overwriting notes entirely -- the old
    // notes-substring scheme would have erased [THANKYOU_SENT] here and
    // re-sent on the next pass. thank_you_sent_at is untouched by that route.
    const booking = h.fake!._all('bookings').find((r) => r.id === 'bk-notes-wiped')!
    booking.notes = 'unrelated staff note, no marker'

    const second = await GET(cronReq())
    expect((await second.json()).follow_ups_sent).toBe(0)
    expect(h.notifyCalls).toHaveLength(1)
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
