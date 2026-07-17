import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/bookings/[id] — team-member reassignment SMS never checked
 * team_members.sms_consent (P1/W2 fresh-ground: the client confirmation/
 * reschedule/cancellation sends right next to this one all gate on
 * sms_consent — see route.sms-consent-guard.test.ts — but the "Team member
 * assigned/reassigned" send between them fired on phone presence alone).
 *
 * team_members.sms_consent is a real, crew-editable column since the
 * team-portal/preferences fix (crew's own SMS toggle) — a crew member who
 * revoked SMS consent still got texted "You're on the job for <date>" every
 * time an admin (re)assigned them to a booking.
 *
 * FIX: the reassignment SMS now also gates on
 * `data.team_members?.sms_consent !== false`.
 *
 * `bookings` gets the same hand-rolled snapshot-table mock as
 * route.sms-consent-guard.test.ts, for the same reason: the route reads the
 * pre-update row (oldBooking) then updates+re-reads the SAME row for
 * memberChanged detection, and the shared harness's live-reference
 * `.select()` would mask that diff.
 */

type Row = Record<string, unknown>

// Keyed by team_member_id — mirrors the real join
// `team_members!bookings_team_member_id_fkey(name, phone, sms_consent)`,
// which the hand-rolled bookings mock below can't resolve on its own.
const TEAM_MEMBERS_BY_ID: Record<string, { name: string; phone: string; sms_consent: boolean }> = {
  'tm-old': { name: 'Old Assignee', phone: '3005550000', sms_consent: true },
  'tm-blocked': { name: 'Blocked Crew', phone: '3005551111', sms_consent: false },
  'tm-control': { name: 'Control Crew', phone: '3005552222', sms_consent: true },
}

function makeBookingsTable(rows: Row[]) {
  return () => {
    const filters: Array<(r: Row) => boolean> = []
    let op: 'select' | 'update' | 'delete' = 'select'
    let updateValues: Row = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      update: (values: Row) => { op = 'update'; updateValues = values; return chain },
      delete: () => { op = 'delete'; return chain },
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      single: async () => {
        const hit = rows.filter((r) => filters.every((f) => f(r)))
        if (op === 'update') {
          hit.forEach((r) => Object.assign(r, updateValues))
        }
        if (!hit.length) return { data: null, error: { code: 'PGRST116' } }
        const row = { ...hit[0] }
        const tmId = row.team_member_id as string | null
        row.team_members = tmId ? TEAM_MEMBERS_BY_ID[tmId] ?? null : null
        return { data: row, error: null }
      },
    }
    return chain
  }
}

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], bookingsRows: [] as Row[] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => (t === 'bookings' ? makeBookingsTable(holder.bookingsRows)() : holder.from!(t)),
  },
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({ success: true }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assignment!' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '', reschedule: () => '' }) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))

import { PUT } from './route'

function bookingsSeed(): Row[] {
  return [
    { id: 'bk-blocked', tenant_id: CTX_TENANT, client_id: null, status: 'draft', team_member_id: 'tm-old', start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: null },
    { id: 'bk-control', tenant_id: CTX_TENANT, client_id: null, status: 'draft', team_member_id: 'tm-old', start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: null },
  ]
}

function seed() {
  return {
    team_members: [
      { id: 'tm-old', tenant_id: CTX_TENANT, name: 'Old Assignee', phone: '3005550000', sms_consent: true },
      { id: 'tm-blocked', tenant_id: CTX_TENANT, name: 'Blocked Crew', phone: '3005551111', sms_consent: false },
      { id: 'tm-control', tenant_id: CTX_TENANT, name: 'Control Crew', phone: '3005552222', sms_consent: true },
    ],
    hr_employee_profiles: [],
    tenants: [{ id: CTX_TENANT, name: 'Alpha', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }],
  }
}

function putReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.bookingsRows = bookingsSeed()
  sendSMSMock.mockClear()
})

describe('bookings/[id] PUT — sms_consent gate on team-member reassignment', () => {
  it('BLOCKED: reassigning to a crew member who revoked sms_consent sends no SMS', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-blocked' }), ctx('bk-blocked'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: reassigning to a consented crew member still sends the assignment SMS', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-control' }), ctx('bk-control'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
  })
})
