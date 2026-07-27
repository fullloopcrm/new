/**
 * getPendingPayCentsForMember / getTotalPendingPayrollCents — must exclude
 * bookings already flagged team_member_paid=true.
 *
 * BUG (fixed here): both previously ignored team_member_paid entirely, so
 * every completed booking counted as "pending" regardless. Checked against
 * nycmaid production 2026-07-27: 609 of 610 completed bookings were already
 * flagged paid (via the bulk closeout action, which sets the flag with no
 * amount recorded — but it's the only payment signal that exists in this
 * data). Ignoring it made the Payroll tab show $47,820.79 owed when the real
 * pending amount was $62.78 — paying that would have been a real double-pay.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { getPendingPayCentsForMember, getTotalPendingPayrollCents } from './payroll-pending'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT = 'tenant-a'
const fake = supabaseAdmin as unknown as FakeSupabase

function seedBooking(id: string, fields: Record<string, unknown>) {
  fake._seed('bookings', [{
    id, tenant_id: TENANT, status: 'completed',
    check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T19:00:00Z', // 10 hours
    pay_rate: 20, team_member_paid: false,
    ...fields,
  }])
}

describe('getPendingPayCentsForMember', () => {
  it('excludes a booking already flagged team_member_paid=true', async () => {
    fake._store.clear()
    seedBooking('bk-1', { team_member_id: 'tm-1', team_member_paid: true })
    const cents = await getPendingPayCentsForMember(TENANT, 'tm-1', null)
    expect(cents).toBe(0)
  })

  it('includes a booking with team_member_paid=false', async () => {
    fake._store.clear()
    seedBooking('bk-1', { team_member_id: 'tm-1', team_member_paid: false })
    const cents = await getPendingPayCentsForMember(TENANT, 'tm-1', null)
    expect(cents).toBe(20000) // 10h * $20
  })

  it('includes a booking with team_member_paid=null (never set)', async () => {
    fake._store.clear()
    seedBooking('bk-1', { team_member_id: 'tm-1', team_member_paid: null })
    const cents = await getPendingPayCentsForMember(TENANT, 'tm-1', null)
    expect(cents).toBe(20000)
  })
})

describe('getTotalPendingPayrollCents', () => {
  it('sums only not-yet-paid bookings across the whole roster', async () => {
    fake._store.clear()
    fake._seed('team_members', [
      { id: 'tm-1', tenant_id: TENANT, status: 'active', pay_rate: 20 },
      { id: 'tm-2', tenant_id: TENANT, status: 'active', pay_rate: 30 },
    ])
    seedBooking('bk-paid', { team_member_id: 'tm-1', team_member_paid: true }) // excluded
    seedBooking('bk-unpaid-1', { team_member_id: 'tm-1', team_member_paid: false }) // 10h * $20 = $200
    seedBooking('bk-unpaid-2', { team_member_id: 'tm-2', team_member_paid: false, pay_rate: null }) // 10h * $30 (member rate) = $300
    const cents = await getTotalPendingPayrollCents(TENANT)
    expect(cents).toBe(50000) // $200 + $300
  })
})
