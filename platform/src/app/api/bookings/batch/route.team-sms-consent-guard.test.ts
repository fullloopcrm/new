import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/bookings/batch — cleaner (team-member) SMS assignment never
 * checked team_members.sms_consent (P1/W2 fresh-ground, same missing-check
 * shape as this file's own route.sms-consent-guard.test.ts, one field over:
 * the client SMS/email confirmation right above the cleaner send DOES gate
 * on sms_consent/do_not_service; the cleaner send never did).
 *
 * team_members.sms_consent is a real, crew-editable column since the
 * team-portal/preferences fix — a crew member who revoked SMS consent still
 * got texted "You're on the job for <date>" for every batch-created booking
 * (recurring-schedule expansion) they were assigned to.
 *
 * FIX: the cleaner SMS send now also gates on `cleaner.sms_consent !== false`.
 *
 * Same hand-rolled bookings-table mock as route.sms-consent-guard.test.ts,
 * extended to also embed the matching seeded team_members() row (the route's
 * `.select('*, clients(*), team_members!bookings_team_member_id_fkey(*))`
 * re-read), since the shared harness doesn't do real foreign-table joins.
 */

type Row = Record<string, unknown>

function makeBookingsTable(clientsById: Record<string, Row>, teamMembersById: Record<string, Row>) {
  return () => {
    let insertRows: Row[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      insert: (rows: Row | Row[]) => {
        const arr = Array.isArray(rows) ? rows : [rows]
        insertRows = arr.map((r, i) => ({
          id: r.id ?? `bk-ins-${i}`,
          ...r,
          clients: clientsById[r.client_id as string] || null,
          team_members: teamMembersById[r.team_member_id as string] || null,
        }))
        return chain
      },
      select: () => chain,
      then: (resolve: (v: unknown) => void) => resolve({ data: insertRows, error: null }),
    }
    return chain
  }
}

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  clientsById: {} as Record<string, Row>,
  teamMembersById: {} as Record<string, Row>,
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => (t === 'bookings' ? makeBookingsTable(holder.clientsById, holder.teamMembersById)() : holder.from!(t)),
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({}))
const sendEmailMock = vi.fn(async (_opts: Record<string, unknown>) => ({}))

vi.mock('@/lib/email', () => ({ sendEmail: (opts: Record<string, unknown>) => sendEmailMock(opts) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assignment!' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmed!' }) }))

import { POST } from './route'

const blockedCleaner = { name: 'Blocked Crew', phone: '3005551111', sms_consent: false }
const controlCleaner = { name: 'Control Crew', phone: '3005552222', sms_consent: true }

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    team_members: [
      { id: 'tm-blocked', tenant_id: CTX_TENANT, ...blockedCleaner },
      { id: 'tm-control', tenant_id: CTX_TENANT, ...controlCleaner },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha', telnyx_api_key: 'key', telnyx_phone: '+15550000000', resend_api_key: 'rkey', email_from: 'noreply@alpha.example.com' }],
  })
  holder.from = h.from
  holder.clientsById = {}
  holder.teamMembersById = { 'tm-blocked': blockedCleaner, 'tm-control': controlCleaner }
  sendSMSMock.mockClear()
  sendEmailMock.mockClear()
})

function post(teamMemberId: string) {
  return POST(new Request('http://t/api/bookings/batch', {
    method: 'POST',
    body: JSON.stringify({
      bookings: [{ team_member_id: teamMemberId, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'scheduled' }],
    }),
  }))
}

describe('bookings/batch POST — sms_consent gate on cleaner assignment', () => {
  it('BLOCKED: a crew member who revoked sms_consent is not texted the assignment', async () => {
    const res = await post('tm-blocked')
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: a consented crew member still gets the assignment SMS', async () => {
    const res = await post('tm-control')
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
  })
})
