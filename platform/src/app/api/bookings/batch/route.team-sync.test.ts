/**
 * POST /api/bookings/batch -- used by BookingsAdmin.tsx to expand a recurring
 * schedule into bookings. Every row got team_member_id stamped but no
 * matching booking_team_members lead row was ever created. GET
 * /api/bookings/:id/team and closeout-summary source the lead from
 * booking_team_members, not bookings.team_member_id -- a batch-created
 * booking with a real assignee showed as unassigned in the admin Team panel
 * and closeout payout attribution. Same booking_team_members-sync gap fixed
 * at every other bookings.team_member_id write site this session, including
 * the single-booking sibling POST /api/bookings.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  sendSMS: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  sendSMS: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: (...a: unknown[]) => h.sendSMS(...a) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'team sms body' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmation sms' }),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const TEAM_MEMBER_ID = 'tm-1'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.sendSMS.mockReset()
  h.sendSMS.mockResolvedValue({ ok: true })
  h.store = {
    bookings: [],
    clients: [{ id: 'client-A1', tenant_id: 'tenant-A', name: 'Pat', phone: null, sms_consent: true }],
    team_members: [{ id: TEAM_MEMBER_ID, tenant_id: 'tenant-A', name: 'Carl', phone: null }],
    service_types: [],
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null, email_from: null }],
    booking_team_members: [],
  }
})

describe('POST /api/bookings/batch — booking_team_members lead sync', () => {
  it('creates a lead booking_team_members row for every row with a team_member_id', async () => {
    const res = await POST(postReq({
      bookings: [
        { client_id: 'client-A1', team_member_id: TEAM_MEMBER_ID, start_time: '2026-08-01T10:00:00Z', status: 'scheduled' },
        { client_id: 'client-A1', team_member_id: TEAM_MEMBER_ID, start_time: '2026-08-08T10:00:00Z', status: 'scheduled' },
      ],
    }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.created).toBe(2)

    const rows = h.store.booking_team_members
    expect(rows.length).toBe(2)
    for (const row of rows) {
      expect(row.team_member_id).toBe(TEAM_MEMBER_ID)
      expect(row.is_lead).toBe(true)
      expect(row.tenant_id).toBe('tenant-A')
    }
  })

  it('creates no booking_team_members rows when no row has a team_member_id', async () => {
    const res = await POST(postReq({
      bookings: [{ client_id: 'client-A1', start_time: '2026-08-01T10:00:00Z', status: 'scheduled' }],
    }))

    expect(res.status).toBe(200)
    expect(h.store.booking_team_members.length).toBe(0)
  })
})
