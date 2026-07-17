/**
 * POST /api/schedules -- when a team member is assigned at series-creation
 * time, every generated booking gets team_member_id set, but GET
 * /api/bookings/:id/team and closeout-summary source the lead from
 * booking_team_members, not bookings.team_member_id. No booking_team_members
 * row was ever created for the initial batch, so a brand-new schedule with a
 * real assignee showed every one of its bookings as unassigned in the admin
 * Team panel and closeout payout attribution. Same booking_team_members-sync
 * gap fixed at every other bookings.team_member_id write site this session,
 * including sibling route POST /api/admin/recurring-schedules.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  audit: vi.fn(),
  generateRecurringDates: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  generateRecurringDates: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const TEAM_MEMBER_ID = '33333333-3333-3333-3333-333333333333'

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))
vi.mock('@/lib/recurring', async () => {
  const actual = await vi.importActual<typeof import('@/lib/recurring')>('@/lib/recurring')
  return { ...actual, generateRecurringDates: (...a: unknown[]) => h.generateRecurringDates(...a) }
})

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: 'owner' }))
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.generateRecurringDates.mockReset()
  h.generateRecurringDates.mockReturnValue([new Date('2026-08-01T09:00:00'), new Date('2026-08-08T09:00:00')])
  h.store = { recurring_schedules: [], service_types: [], bookings: [], booking_team_members: [] }
})

describe('POST /api/schedules -- booking_team_members sync', () => {
  it('creates a lead booking_team_members row for every generated booking when team_member_id is set', async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly', team_member_id: TEAM_MEMBER_ID }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.bookingsCreated).toBe(2)

    const rows = h.store.booking_team_members
    expect(rows.length).toBe(2)
    for (const row of rows) {
      expect(row.team_member_id).toBe(TEAM_MEMBER_ID)
      expect(row.is_lead).toBe(true)
      expect(row.tenant_id).toBe('tenant-A')
    }
    const bookingIds = new Set(h.store.bookings.map((b) => b.id))
    expect(new Set(rows.map((r) => r.booking_id))).toEqual(bookingIds)
  })

  it('creates no booking_team_members rows when no team_member_id is given', async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID, recurring_type: 'weekly' }))

    expect(res.status).toBe(201)
    expect(h.store.booking_team_members.length).toBe(0)
  })
})
