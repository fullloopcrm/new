/**
 * GET /api/cron/follow-up had NO dedup guard at all — every booking whose
 * check_out_time fell in today's ~2-hour window got a follow_up notify()
 * every time the route ran, with nothing recorded to stop a second run from
 * re-sending. Unlike the other crons fixed this session (a concurrent-
 * overlap race), this was a plain replay bug: a manual re-trigger on the
 * same day, or a scheduler retry, would re-email every eligible client a
 * second "thank you — use THANKYOU for 10% off" message. Fixed by skipping
 * bookings that already have a `follow_up` row in `notifications`, same
 * dedup shape as the confirmations cron's confirm-request checks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.CRON_SECRET = 'test-secret'

const { TENANT_ID } = vi.hoisted(() => ({ TENANT_ID: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    tenants: [{ id: TENANT_ID, name: 'Acme' }],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

const notifyCalls: string[] = []
vi.mock('@/lib/notify', async () => {
  const { supabaseAdmin } = await import('@/lib/supabase')
  return {
    notify: vi.fn(async ({ tenantId, bookingId, type }: { tenantId: string; bookingId: string; type: string }) => {
      notifyCalls.push(bookingId)
      // Mirror the real notify()'s behavior: it always writes a
      // `notifications` row (the dedup check's source of truth) before
      // attempting the actual send.
      await (supabaseAdmin as any).from('notifications').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        type,
      })
    }),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

function seedEligibleBooking() {
  const checkedOutAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // exactly 3 days ago
  fake._seed('bookings', [
    {
      id: 'booking-1',
      tenant_id: TENANT_ID,
      client_id: 'client-1',
      service_type: 'Standard Cleaning',
      status: 'completed',
      check_out_time: checkedOutAt,
      clients: { name: 'Jane Doe' },
    },
  ])
}

describe('GET /api/cron/follow-up — duplicate-send guard', () => {
  beforeEach(() => {
    notifyCalls.length = 0
  })

  it('sends once for a normal single run', async () => {
    seedEligibleBooking()
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.follow_ups_sent).toBe(1)
    expect(notifyCalls).toEqual(['booking-1'])
  })

  it('does not re-send on a same-day re-trigger (manual re-run or scheduler retry)', async () => {
    seedEligibleBooking()

    await GET(req())
    notifyCalls.length = 0

    const res = await GET(req())
    const json = await res.json()
    expect(json.follow_ups_sent).toBe(0)
    expect(notifyCalls).toEqual([])
  })
})
