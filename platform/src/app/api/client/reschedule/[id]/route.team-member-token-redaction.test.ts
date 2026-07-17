import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/client/reschedule/[id] — bookings.team_member_token/
 * token_expires_at redaction probe.
 *
 * BUG (fixed here): the read-back after the reschedule UPDATE does
 * `select('*, clients(*), team_members!bookings_team_member_id_fkey(*))` and
 * the whole top-level row was spread verbatim into the JSON response
 * (`{ ...updated, ... }`). `bookings.team_member_token` is a fresh
 * crypto-random token generated and stored on EVERY booking (client/book's
 * generateCleanerToken(), client/recurring, admin/recurring-schedules,
 * bookings/batch, sale-to-recurring.ts all write it) — schema.sql's
 * `worker_token` column comment ("Team member token (for portal access)")
 * describes this same field under its stale pre-rename name;
 * admin/recurring-schedules/route.ts's own doc comment confirms the live
 * column is `team_member_token` (nycmaid's `cleaner_token` renamed on
 * port). Nothing in the repo ever reads/validates either name as a
 * credential — it's written but never consumed for its apparent
 * portal-access purpose, and it was shipping straight to the client's
 * browser on every reschedule.
 *
 * FIX: redact `team_member_token`/`worker_token`/`token_expires_at` from the
 * top-level spread via omit(), same helper already used for the
 * clients.pin/team_members.pin fix on this same route.
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

const SECRET_TEAM_MEMBER_TOKEN = 'tmtok_live_secret_abc123'
const SECRET_LEGACY_WORKER_TOKEN = 'wtok_legacy_secret_xyz'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    bookings: [
      {
        id: 'bk-1', tenant_id: 'tid-a', client_id: 'client-a', team_member_id: 'tm-a1',
        start_time: '2026-08-01T10:00:00Z',
        team_member_token: SECRET_TEAM_MEMBER_TOKEN, worker_token: SECRET_LEGACY_WORKER_TOKEN,
        token_expires_at: '2026-08-01T12:00:00Z',
        clients: { id: 'client-a', name: 'Client A' },
        team_members: { id: 'tm-a1', name: 'Crew A' },
      },
    ],
    team_members: [{ id: 'tm-a1', tenant_id: 'tid-a' }],
  })
  holder.from = h.from
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://t/api/client/reschedule/bk-1', { method: 'PUT', body: JSON.stringify(body) })
}
function params() {
  return { params: Promise.resolve({ id: 'bk-1' }) }
}

describe('client/reschedule/[id] — team_member_token redaction probe', () => {
  it('never returns bookings.team_member_token (the live, actively-written field)', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.team_member_token).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(SECRET_TEAM_MEMBER_TOKEN)
  })

  it('never returns bookings.worker_token (the stale legacy name, redacted defensively)', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params())
    const body = await res.json()
    expect(body.worker_token).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(SECRET_LEGACY_WORKER_TOKEN)
  })

  it('never returns bookings.token_expires_at', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params())
    const body = await res.json()
    expect(body.token_expires_at).toBeUndefined()
  })

  it('CONTROL: still returns the fields the reschedule flow needs (id, names)', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params())
    const body = await res.json()
    expect(body.id).toBe('bk-1')
    expect(body.clients.name).toBe('Client A')
    expect(body.team_members.name).toBe('Crew A')
  })
})
