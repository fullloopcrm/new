import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/recurring — auth-gap regression test.
 *
 * BUG (fixed here): `client_id` came straight from the request body with zero
 * authentication. An unauthenticated caller could create a real recurring
 * booking series (with real pricing) against ANY client and silently
 * overwrite that client's preferred_team_member_id
 * (deploy-prep/none-write-routes-triage.md row 3).
 *
 * FIX: requires a client-portal Bearer token (verifyPortalToken); client_id
 * and tenant_id are derived from the token, never trusted from the body.
 */

const TOKEN_A = 'token-for-client-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('../../portal/auth/token', () => ({
  verifyPortalToken: (token: string) => (token === TOKEN_A ? { id: 'client-a', tid: 'tid-a' } : null),
}))
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok-123' }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientEmail: vi.fn(async () => {}),
  sendClientSMS: vi.fn(async () => ({ sent: 1, skipped: 0 })),
}))
vi.mock('@/lib/messaging/client-email', () => ({ confirmationEmailFor: vi.fn(async () => ({ subject: 's', html: 'h' })) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: vi.fn(async () => ({ bookingConfirmation: () => 'msg' })) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [
      { id: 'client-a', tenant_id: 'tid-a', preferred_team_member_id: null },
      { id: 'client-b', tenant_id: 'tid-b', preferred_team_member_id: 'tm-b1' },
    ],
    bookings: [
      { id: 'past-1', tenant_id: 'tid-a', client_id: 'client-a', status: 'completed' },
    ],
    recurring_schedules: [],
    booking_team_members: [],
    team_members: [
      { id: 'tm-a1', tenant_id: 'tid-a' },
      { id: 'tm-b1', tenant_id: 'tid-b' },
    ],
    client_properties: [
      { id: 'prop-a1', tenant_id: 'tid-a', client_id: 'client-a' },
      { id: 'prop-b1', tenant_id: 'tid-b', client_id: 'client-b' },
    ],
  })
  holder.from = h.from
})

const validBody = {
  frequency: 'weekly',
  start_date: '2026-08-03',
  time: '10:00',
  hours: 2,
  service_type: 'Standard Cleaning',
}

function req(headers: Record<string, string>, body: Record<string, unknown>) {
  return new Request('http://t/api/client/recurring', { method: 'POST', headers, body: JSON.stringify(body) })
}

describe('client/recurring — auth gap fixed', () => {
  it('no token → 401, no booking series created', async () => {
    const res = await POST(req({}, { ...validBody, client_id: 'client-a' }))
    expect(res.status).toBe(401)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
  })

  it('wrong-tenant probe: a valid token for client A can never create a series or overwrite data for client B', async () => {
    // Attacker holds a valid token for client A but tries to smuggle client B's id in the body.
    // Uses a same-tenant cleaner (tm-a1) so the cross-tenant-cleaner guard doesn't mask this assertion.
    const res = await POST(req({ authorization: `Bearer ${TOKEN_A}` }, { ...validBody, client_id: 'client-b', cleaner_id: 'tm-a1' }))
    expect(res.status).toBe(200)
    const scheduleIns = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(scheduleIns).toBeDefined()
    // Every row created must be stamped with the TOKEN's client/tenant, never
    // the body-supplied client_id.
    expect(scheduleIns!.rows.every((r) => r.client_id === 'client-a' && r.tenant_id === 'tid-a')).toBe(true)
    const bookingsIns = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(bookingsIns!.rows.every((r) => r.client_id === 'client-a' && r.tenant_id === 'tid-a')).toBe(true)
    // preferred_team_member_id write lands on client A (the token owner) only —
    // client B's row must never be touched, even though its id was in the body.
    const clientUpdate = h.capture.updates.find((u) => u.table === 'clients')
    expect(clientUpdate!.matched.every((r) => r.id === 'client-a')).toBe(true)
    expect(h.seed.clients.find((c) => c.id === 'client-b')!.preferred_team_member_id).toBe('tm-b1')
  })

  it('cross-tenant cleaner_id probe: a client cannot assign another tenant\'s team member', async () => {
    // Client A (tid-a) tries to assign tm-b1, which belongs to tid-b.
    const res = await POST(req({ authorization: `Bearer ${TOKEN_A}` }, { ...validBody, client_id: 'client-a', cleaner_id: 'tm-b1' }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
    // preferred_team_member_id must not have been overwritten with the foreign id.
    expect(h.seed.clients.find((c) => c.id === 'client-a')!.preferred_team_member_id).toBeNull()
  })

  it('cross-tenant extra_cleaner_ids probe: a foreign id in the extras array also rejects the whole request', async () => {
    const res = await POST(req({ authorization: `Bearer ${TOKEN_A}` }, { ...validBody, client_id: 'client-a', cleaner_id: 'tm-a1', extra_cleaner_ids: ['tm-b1'] }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
  })

  it('same-tenant cleaner_id succeeds and is applied to the created series', async () => {
    const res = await POST(req({ authorization: `Bearer ${TOKEN_A}` }, { ...validBody, client_id: 'client-a', cleaner_id: 'tm-a1' }))
    expect(res.status).toBe(200)
    const scheduleIns = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(scheduleIns!.rows.every((r) => r.team_member_id === 'tm-a1')).toBe(true)
    expect(h.seed.clients.find((c) => c.id === 'client-a')!.preferred_team_member_id).toBe('tm-a1')
  })

  it('cross-client property_id probe: a client cannot attach another client\'s property', async () => {
    const res = await POST(req({ authorization: `Bearer ${TOKEN_A}` }, { ...validBody, client_id: 'client-a', property_id: 'prop-b1' }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
  })

  it('own property_id succeeds and is applied to the created series', async () => {
    const res = await POST(req({ authorization: `Bearer ${TOKEN_A}` }, { ...validBody, client_id: 'client-a', property_id: 'prop-a1' }))
    expect(res.status).toBe(200)
    const scheduleIns = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(scheduleIns!.rows.every((r) => r.property_id === 'prop-a1')).toBe(true)
  })
})
