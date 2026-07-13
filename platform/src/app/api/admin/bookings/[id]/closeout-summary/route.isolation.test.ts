import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/bookings/[id]/closeout-summary — tenantDb() conversion probe
 * (P1/W1 backlog batch). Platform-admin route: the booking lookup by id is
 * deliberately cross-tenant (superadmin tool), but every child table
 * (booking_team_members/payments/team_member_payouts/sms_logs) is now
 * scoped to the booking's OWN tenant via tenantDb(booking.tenant_id) instead
 * of a bare `.eq('booking_id', id)` — defense-in-depth, mirrors the
 * cleaner-payout route's precedent.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))

import { GET } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', status: 'completed', team_size: 1, hourly_rate: 79 },
    ],
    booking_team_members: [
      { id: 'btm-1', booking_id: 'book-A1', tenant_id: 'tenant-A', team_member_id: 'tm-1', is_lead: true, position: 0, team_members: { id: 'tm-1', name: 'Alex', phone: null, hourly_rate: null } },
      // Same booking_id, wrong tenant — a data-integrity-attack shape.
      { id: 'btm-2', booking_id: 'book-A1', tenant_id: 'tenant-B', team_member_id: 'tm-evil', is_lead: true, position: 0, team_members: { id: 'tm-evil', name: 'Evil', phone: null, hourly_rate: null } },
    ],
    payments: [
      { id: 'pay-1', booking_id: 'book-A1', tenant_id: 'tenant-A', amount_cents: 1000 },
      { id: 'pay-2', booking_id: 'book-A1', tenant_id: 'tenant-B', amount_cents: 999999 },
    ],
    team_member_payouts: [
      { id: 'po-1', booking_id: 'book-A1', tenant_id: 'tenant-A', team_member_id: 'tm-1', amount_cents: 500 },
      { id: 'po-2', booking_id: 'book-A1', tenant_id: 'tenant-B', team_member_id: 'tm-evil', amount_cents: 999999 },
    ],
    sms_logs: [
      { id: 'sms-1', booking_id: 'book-A1', tenant_id: 'tenant-A', sms_type: 'confirmation' },
      { id: 'sms-2', booking_id: 'book-A1', tenant_id: 'tenant-B', sms_type: 'secret-B' },
    ],
  }
})

describe('GET /api/admin/bookings/[id]/closeout-summary — tenant isolation', () => {
  it('payments never include a same-booking_id row stamped with another tenant_id', async () => {
    const res = await GET(new Request('http://x'), params('book-A1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.payments.map((p: { id: string }) => p.id)).toEqual(['pay-1'])
    expect(json.payment_totals.paid_cents).toBe(1000)
  })

  it('sms_log never includes a same-booking_id row stamped with another tenant_id', async () => {
    const res = await GET(new Request('http://x'), params('book-A1'))
    const json = await res.json()
    expect(json.sms_log.map((s: { id: string }) => s.id)).toEqual(['sms-1'])
    expect(JSON.stringify(json)).not.toContain('secret-B')
  })

  it('cleaner_payouts never attribute a wrong-tenant payout row to a real team member', async () => {
    const res = await GET(new Request('http://x'), params('book-A1'))
    const json = await res.json()
    const lead = json.cleaner_payouts.find((c: { cleaner_id: string }) => c.cleaner_id === 'tm-1')
    expect(lead.total_paid_cents).toBe(500)
  })
})
