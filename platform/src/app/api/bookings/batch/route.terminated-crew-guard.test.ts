import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/bookings/batch — terminated-crew guard (P1/W2 fresh-ground).
 *
 * Same gap class as the already-fixed single-create paths (86b797ad,
 * 53e83ee4, ca14a7fe, ff827f1d): this route validated a team_member_id
 * belongs to the tenant but never checked hr_status. Its only real caller is
 * the dashboard "Create Booking" modal's multi-date path (BookingsAdmin.tsx),
 * a live admin-triggered surface -- a terminated worker picked here got
 * silently assigned to every date in the batch.
 *
 * FIX: requestedMemberIds now runs through getTerminatedTeamMemberIds right
 * after the existing tenant-ownership check, before the insert.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: vi.fn(() => 'msg') }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ bookingConfirmation: () => 'msg' })),
}))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    bookings: [],
    clients: [{ id: 'c1', tenant_id: A }],
    team_members: [
      { id: 'tm-terminated', tenant_id: A },
      { id: 'tm-active', tenant_id: A },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
  })
  holder.from = h.from
})

function post(bookings: unknown[]) {
  return POST(new Request('http://t/api/bookings/batch', { method: 'POST', body: JSON.stringify({ bookings }) }))
}

describe('bookings/batch POST — terminated-crew guard', () => {
  it('BLOCKED: any row targeting a terminated team member 400s, nothing in the batch is inserted', async () => {
    const res = await post([
      { client_id: 'c1', team_member_id: 'tm-active', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
      { client_id: 'c1', team_member_id: 'tm-terminated', start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
    ])
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: an active team member still bulk-creates', async () => {
    const res = await post([
      { client_id: 'c1', team_member_id: 'tm-active', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
    ])
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(ins!.rows[0].team_member_id).toBe('tm-active')
  })
})
