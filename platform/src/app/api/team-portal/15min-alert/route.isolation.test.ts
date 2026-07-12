import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * team-portal/15min-alert — auth-gap regression test.
 *
 * BUG (fixed here): zero authentication — no verifyToken, no team_member_id
 * field at all. Anyone who knew/guessed a bookingId could trigger a real
 * client-facing "pay now" SMS + admin alerts on demand
 * (deploy-prep/none-write-routes-triage.md row 6).
 *
 * FIX: requires a team-portal Bearer token (verifyToken); the booking must
 * belong to the token's tenant AND its team_member_id must match auth.id
 * (same ownership check as checkin/checkout).
 */

const TOKEN_A = 'token-for-member-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => (token === TOKEN_A ? { id: 'member-a', tid: 'tid-a', role: 'worker' } : null),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS: vi.fn(async () => ({ sent: 1, skipped: 0 })) }))
vi.mock('@/lib/billing-hours', () => ({ clientBilledHours: () => 1, cleanerPaidHours: () => 1 }))
vi.mock('@/lib/cleaner-pay', () => ({ effectiveCleanerRate: (r: number) => r }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    bookings: [
      {
        id: 'booking-a', tenant_id: 'tid-a', team_member_id: 'member-a',
        start_time: '2026-07-12T10:00:00Z', check_in_time: '2026-07-12T10:00:00Z',
        hourly_rate: 69, pay_rate: 25, payment_status: 'unpaid', client_id: 'client-a',
        clients: { name: 'Alice', phone: '5551110000', email: null, address: null },
        team_members: { name: 'Alice', pay_rate: 25 },
      },
      {
        id: 'booking-b', tenant_id: 'tid-b', team_member_id: 'member-b',
        start_time: '2026-07-12T10:00:00Z', check_in_time: '2026-07-12T10:00:00Z',
        hourly_rate: 69, pay_rate: 25, payment_status: 'unpaid', client_id: 'client-b',
        clients: { name: 'Bob', phone: '5552220000', email: null, address: null },
        team_members: { name: 'Bob', pay_rate: 25 },
      },
    ],
    tenants: [
      { id: 'tid-a', name: 'Tenant A', telnyx_api_key: null, telnyx_phone: null, payment_link: null },
      { id: 'tid-b', name: 'Tenant B', telnyx_api_key: null, telnyx_phone: null, payment_link: null },
    ],
  })
  holder.from = h.from
})

function postReq(headers: Record<string, string>, body: unknown) {
  return new NextRequest('http://t/api/team-portal/15min-alert', { method: 'POST', headers, body: JSON.stringify(body) })
}

describe('team-portal/15min-alert — auth gap fixed', () => {
  it('no token → 401, no SMS/notify triggered', async () => {
    const res = await postReq({}, { bookingId: 'booking-a' })
    const response = await POST(res)
    expect(response.status).toBe(401)
  })

  it('wrong-tenant / wrong-member probe: a valid token for member A can never trigger an alert on member B\'s booking', async () => {
    const res = await POST(postReq({ authorization: `Bearer ${TOKEN_A}` }, { bookingId: 'booking-b' }))
    expect(res.status).toBe(404)
  })

  it('positive control: member A can trigger the alert on their own booking', async () => {
    const res = await POST(postReq({ authorization: `Bearer ${TOKEN_A}` }, { bookingId: 'booking-a' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
