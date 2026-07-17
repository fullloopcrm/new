import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/team-portal/running-late — client SMS never checked sms_consent
 * or do_not_service (P1/W2 fresh-ground audit of the missing-sms_consent-check
 * pattern — same invariant every other client SMS fan-out enforces:
 * payment-processor.ts, webhooks/stripe.ts, client/book, client/reschedule,
 * schedules/[id]/pause).
 *
 * BUG (fixed here): a crew member self-reporting running late texts the
 * client directly (`smsRunningLateClient`) gated only on `clientPhone`
 * truthiness. A client who replied STOP (sms_consent=false) or who is
 * flagged do_not_service still got texted on every late report.
 *
 * FIX: the client SMS send now also gates on
 * `sms_consent !== false && !do_not_service`. The admin-facing SMS is
 * unaffected — it never involved client consent.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: vi.fn(async () => ({
    auth: { id: 'tm-1', tid: TENANT, role: 'member' },
    error: null,
  })),
}))

const sendSMSMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}), sendPushToClient: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsRunningLateClient: () => 'client-msg', smsRunningLateAdmin: () => 'admin-msg' }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-blocked', tenant_id: TENANT, start_time: '2026-08-01T14:00:00Z', team_member_id: 'tm-1', client_id: 'c-blocked', clients: { name: 'Blocked Client', phone: '3005551111', sms_consent: false, do_not_service: false }, team_members: { name: 'Crew A' } },
      { id: 'bk-dns', tenant_id: TENANT, start_time: '2026-08-01T14:00:00Z', team_member_id: 'tm-1', client_id: 'c-dns', clients: { name: 'DNS Client', phone: '3005554444', sms_consent: true, do_not_service: true }, team_members: { name: 'Crew A' } },
      { id: 'bk-control', tenant_id: TENANT, start_time: '2026-08-01T14:00:00Z', team_member_id: 'tm-1', client_id: 'c-control', clients: { name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false }, team_members: { name: 'Crew A' } },
      { id: 'bk-null-consent', tenant_id: TENANT, start_time: '2026-08-01T14:00:00Z', team_member_id: 'tm-1', client_id: 'c-null', clients: { name: 'Null Consent Client', phone: '3005553333', sms_consent: null, do_not_service: false }, team_members: { name: 'Crew A' } },
    ],
    tenants: [
      { id: TENANT, name: 'Acme', owner_phone: '3005559999', phone: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  sendSMSMock.mockClear()
})

function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('team-portal/running-late POST — sms_consent / do_not_service gate on client SMS', () => {
  it('BLOCKED: sms_consent=false client is not texted on a running-late report', async () => {
    const res = await POST(req({ bookingId: 'bk-blocked', eta: 10 }))
    expect(res.status).toBe(200)
    const clientCalls = sendSMSMock.mock.calls.filter((c: any[]) => (c[0] as any).to === '3005551111')
    expect(clientCalls).toHaveLength(0)
  })

  it('BLOCKED: do_not_service=true client is not texted even with sms_consent=true', async () => {
    const res = await POST(req({ bookingId: 'bk-dns', eta: 10 }))
    expect(res.status).toBe(200)
    const clientCalls = sendSMSMock.mock.calls.filter((c: any[]) => (c[0] as any).to === '3005554444')
    expect(clientCalls).toHaveLength(0)
  })

  it('CONTROL: sms_consent=true, do_not_service=false client is still texted', async () => {
    const res = await POST(req({ bookingId: 'bk-control', eta: 10 }))
    expect(res.status).toBe(200)
    const clientCalls = sendSMSMock.mock.calls.filter((c: any[]) => (c[0] as any).to === '3005552222')
    expect(clientCalls).toHaveLength(1)
  })

  it('CONTROL: sms_consent=null (never explicitly asked) defaults to allowed', async () => {
    const res = await POST(req({ bookingId: 'bk-null-consent', eta: 10 }))
    expect(res.status).toBe(200)
    const clientCalls = sendSMSMock.mock.calls.filter((c: any[]) => (c[0] as any).to === '3005553333')
    expect(clientCalls).toHaveLength(1)
  })

  it('CONTROL: the admin SMS is unaffected by client consent state', async () => {
    const res = await POST(req({ bookingId: 'bk-blocked', eta: 10 }))
    expect(res.status).toBe(200)
    const adminCalls = sendSMSMock.mock.calls.filter((c: any[]) => (c[0] as any).to === '+13005559999')
    expect(adminCalls).toHaveLength(1)
  })
})
