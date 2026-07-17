import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/client/reschedule/[id] — clients.pin / team_members.pin redaction probe.
 *
 * BUG (fixed here): the read-back after the reschedule UPDATE does
 * `select('*, clients(*), team_members!bookings_team_member_id_fkey(*))`
 * (needed by the async notification fan-out for .name/.phone/.sms_consent),
 * then returned that ENTIRE object to the CLIENT'S browser via
 * `NextResponse.json(updated)`. That includes `team_members.pin` — the
 * ASSIGNED CREW MEMBER'S plaintext team-portal login PIN (POST
 * /api/team-portal/auth checks it directly), not the client's own — handed
 * to an authenticated customer with zero admin/employee access, on every
 * reschedule of a booking that has an assigned crew member. Also includes
 * `clients.pin`, the caller's own plaintext client-portal login PIN. This is
 * the most severe instance of this round's pin-exposure sweep: it crosses a
 * customer→employee credential boundary, not just an admin-visibility one.
 *
 * FIX: redact `pin` from both embedded objects on a fresh copy built at the
 * return statement; the async notification closure above already captured
 * the un-redacted `updated` by reference, so notifications are unaffected.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', timezone: 'America/New_York', name: 'Acme' })),
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: vi.fn(async () => ({ clientId: 'client-a' })),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'msg' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'msg' }) }))

import { PUT } from './route'

const CLIENT_SECRET_PIN = '111222'
const CREW_SECRET_PIN = '333444'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    bookings: [
      {
        id: 'bk-1', tenant_id: 'tid-a', client_id: 'client-a', team_member_id: 'tm-a1',
        start_time: '2026-08-01T10:00:00Z',
        clients: { id: 'client-a', name: 'Client A', pin: CLIENT_SECRET_PIN },
        team_members: { id: 'tm-a1', name: 'Crew A', pin: CREW_SECRET_PIN },
      },
    ],
    team_members: [{ id: 'tm-a1', tenant_id: 'tid-a', pin: CREW_SECRET_PIN }],
  })
  holder.from = h.from
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://t/api/client/reschedule/bk-1', { method: 'PUT', body: JSON.stringify(body) })
}
function params() {
  return { params: Promise.resolve({ id: 'bk-1' }) }
}

describe('client/reschedule/[id] — pin redaction probe', () => {
  it('never returns the assigned crew member\'s team_members.pin', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.team_members.pin).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(CREW_SECRET_PIN)
  })

  it('never returns the client\'s own clients.pin', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.clients.pin).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(CLIENT_SECRET_PIN)
  })

  it('CONTROL: still returns the fields the reschedule flow needs (names, ids)', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params())
    const body = await res.json()
    expect(body.clients.name).toBe('Client A')
    expect(body.team_members.name).toBe('Crew A')
    expect(body.id).toBe('bk-1')
  })
})
