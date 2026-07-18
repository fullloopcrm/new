import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * bookings.team_size is a billing multiplier (how many people the CLIENT is
 * charged for) — it is set once at booking creation/edit and is NOT required
 * to equal the number of booking_team_members rows actually assigned to the
 * job (PUT /api/bookings/[id]/team lets an admin set team_size ahead of
 * naming every crew member, e.g. "billed as a 3-person job, 1 named so far").
 * The tip-share math here divided the tip by `teamSize` (the billing intent)
 * instead of the actual assigned crew (`teamMembers.length`) — when fewer
 * people were actually on the job than the billed headcount, the shares
 * handed to the real crew in cleaner_payouts summed to LESS than the total
 * tip collected. The difference silently vanished: not paid to any team
 * member, not flagged, not logged anywhere.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { GET } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }))
  h.store = {
    bookings: [
      {
        id: 'book-A1', tenant_id: 'tenant-A', status: 'completed',
        team_size: 3, hourly_rate: 100, actual_hours: 2,
      },
    ],
    // Billed as a team of 3, but only 1 crew member is actually named.
    booking_team_members: [
      { id: 'btm-1', booking_id: 'book-A1', tenant_id: 'tenant-A', team_member_id: 'tm-1', is_lead: true, position: 0, team_members: { id: 'tm-1', name: 'Alex', phone: null, hourly_rate: null } },
    ],
    payments: [
      // gross = 2h * $100 * 3 = $600 (60000c); paid 70000c -> $100 (10000c) tip.
      { id: 'pay-1', booking_id: 'book-A1', tenant_id: 'tenant-A', amount_cents: 70000 },
    ],
    team_member_payouts: [],
    sms_logs: [],
  }
})

describe('GET /api/admin/bookings/[id]/closeout-summary — tip split', () => {
  it('splits the full tip across the actually-assigned crew, not the billed team_size', async () => {
    const res = await GET(new Request('http://x'), params('book-A1'))
    const json = await res.json()

    expect(json.payment_totals.tip_cents).toBe(10000)
    expect(json.cleaner_payouts).toHaveLength(1)

    const totalTipPaidOut = json.cleaner_payouts.reduce((s: number, c: { tip_cents: number }) => s + c.tip_cents, 0)
    expect(totalTipPaidOut).toBe(json.payment_totals.tip_cents)
  })
})
