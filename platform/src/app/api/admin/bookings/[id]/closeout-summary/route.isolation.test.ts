import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/bookings/[id]/closeout-summary GET — tenant isolation.
 *
 * BUG (fixed here): this route lives behind the GLOBAL /dashboard bookings
 * closeout widget (BookingsAdmin.tsx -> closeout-detail.tsx), reached by
 * every tenant's own admin — not the platform admin panel. It was gated on
 * requireAdmin(), which only accepts the platform-wide super_admin token, so
 * every ordinary tenant_admin session 401'd (same class as the
 * schedule-issues fix, commit 05176c2f). None of its queries (bookings,
 * booking_team_members, payments, team_member_payouts, sms_logs) were
 * tenant-scoped either, so once reachable a caller could pull another
 * tenant's client PII, payment amounts, and team-member payout data by id.
 *
 * FIX: swapped to requirePermission('bookings.view') and added
 * .eq('tenant_id', tenantId) to every query.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    bookings: [
      {
        id: 'bk-a', tenant_id: CTX_TENANT, status: 'completed', start_time: '2026-08-01T10:00:00Z',
        end_time: '2026-08-01T12:00:00Z', service_type: 'cleaning', hourly_rate: 79, team_size: 1,
        actual_hours: 2, price: 15800, client_id: 'c-a', team_member_id: 'tm-a1', notes: '',
      },
      {
        id: 'bk-b', tenant_id: OTHER_TENANT, status: 'completed', start_time: '2026-08-01T10:00:00Z',
        end_time: '2026-08-01T12:00:00Z', service_type: 'cleaning', hourly_rate: 79, team_size: 1,
        actual_hours: 2, price: 15800, client_id: 'c-b', team_member_id: 'tm-b1', notes: '',
      },
    ],
    booking_team_members: [],
    payments: [
      { id: 'pay-a', tenant_id: CTX_TENANT, booking_id: 'bk-a', amount_cents: 15800, created_at: '2026-08-01T12:05:00Z' },
      { id: 'pay-b', tenant_id: OTHER_TENANT, booking_id: 'bk-b', amount_cents: 15800, created_at: '2026-08-01T12:05:00Z' },
    ],
    team_member_payouts: [],
    sms_logs: [],
  }
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/bookings/[id]/closeout-summary GET — tenant isolation', () => {
  it('positive control: same-tenant booking returns a full closeout summary', async () => {
    const res = await GET(new Request('http://t'), ctx('bk-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.id).toBe('bk-a')
    expect(body.payments).toHaveLength(1)
    expect(body.payments[0].id).toBe('pay-a')
  })

  it("wrong-tenant probe: another tenant's booking id 404s instead of returning its closeout data", async () => {
    const res = await GET(new Request('http://t'), ctx('bk-b'))
    expect(res.status).toBe(404)
    const text = JSON.stringify(await res.clone().json())
    expect(text).not.toContain('pay-b')
  })

  it("wrong-tenant probe: foreign payments never leak into the response even if queried", async () => {
    const res = await GET(new Request('http://t'), ctx('bk-a'))
    const body = await res.json()
    expect((body.payments as Array<{ id: string }>).some((p) => p.id === 'pay-b')).toBe(false)
  })
})
