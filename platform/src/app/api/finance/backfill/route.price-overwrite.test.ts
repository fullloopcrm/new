/**
 * FINANCE BACKFILL — silent price overwrite
 *
 * `finance/backfill` fills `actual_hours`/`team_member_pay`/`price` for
 * completed bookings missing `team_member_pay`. Every booking gets a real
 * `price` at creation time from the quote/flat-fee total (sale-to-booking.ts,
 * client/book) — `team_member_pay` being unset does NOT imply `price` is
 * unset too. The old code recomputed `price` from `hours * hourly_rate`
 * unconditionally, silently clobbering an already-quoted/invoiced price
 * (which post-revenue.ts posts to the ledger from) with a fabricated
 * hourly-formula estimate.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

describe('POST /api/finance/backfill — does not overwrite an already-set price', () => {
  it('leaves a quoted/flat-fee price untouched when only team_member_pay is missing', async () => {
    fake._seed('bookings', [
      {
        id: 'booking-1',
        tenant_id: TENANT_ID,
        status: 'completed',
        start_time: '2026-01-01T10:00:00Z',
        end_time: '2026-01-01T14:00:00Z',
        team_member_id: 'tm-1',
        hourly_rate: 75,
        check_in_time: null,
        check_out_time: null,
        actual_hours: null,
        team_member_pay: null,
        // Real quoted price for a big job -- far from the 4h * $75 = $300
        // the hourly formula would produce.
        price: 50000,
        team_members: { hourly_rate: 25 },
      } as Row,
    ])

    const res = await POST()
    expect(res.status).toBe(200)

    const booking = (fake._store.get('bookings') || [])[0]
    expect(booking.price).toBe(50000)
    expect(booking.team_member_pay).toBe(10000) // 4h * $25 * 100
    expect(booking.actual_hours).toBe(4)
  })

  it('still fills price when it is genuinely missing', async () => {
    fake._seed('bookings', [
      {
        id: 'booking-2',
        tenant_id: TENANT_ID,
        status: 'completed',
        start_time: '2026-01-01T10:00:00Z',
        end_time: '2026-01-01T14:00:00Z',
        team_member_id: 'tm-1',
        hourly_rate: 75,
        check_in_time: null,
        check_out_time: null,
        actual_hours: null,
        team_member_pay: null,
        price: null,
        team_members: { hourly_rate: 25 },
      } as Row,
    ])

    const res = await POST()
    expect(res.status).toBe(200)

    const booking = (fake._store.get('bookings') || [])[0]
    expect(booking.price).toBe(30000) // 4h * $75 * 100
  })
})
