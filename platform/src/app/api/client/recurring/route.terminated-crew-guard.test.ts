import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/recurring POST — terminated-crew guard (P1/W2 fresh-ground).
 *
 * BUG (fixed here): cleaner_id/extra_cleaner_ids were only checked for tenant
 * ownership, never HR termination. HR termination never touches
 * team_members.status/active (deliberate — see hr.ts's own doc comment), so a
 * fired employee could be handed a brand-new STANDING recurring series here:
 * this route raw-inserts recurring_schedules.team_member_id, 6 weeks of real
 * bookings.team_member_id (status='scheduled'), booking_team_members rows,
 * and clients.preferred_team_member_id directly via supabaseAdmin — none of
 * which go through POST /api/bookings, PUT /api/bookings/[id]/team, or PUT
 * /api/client/preferred-cleaner, so none of those routes' own terminated-crew
 * guards ever ran. Same root cause and blast radius as the generate-recurring
 * cron gap (closed 8131f28a): a raw insert bypassing every guarded route.
 *
 * FIX: requestedMemberIds (cleaner_id + extras) now also run through
 * getTerminatedTeamMemberIds, right after the existing tenant-ownership check.
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

const CTX_TENANT = 'tid-a'

function seed() {
  return {
    clients: [
      { id: 'client-a', tenant_id: CTX_TENANT, preferred_team_member_id: null },
    ],
    bookings: [
      { id: 'past-1', tenant_id: CTX_TENANT, client_id: 'client-a', status: 'completed' },
    ],
    recurring_schedules: [],
    booking_team_members: [],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT },
      { id: 'tm-active', tenant_id: CTX_TENANT },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    client_properties: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const validBody = {
  frequency: 'weekly',
  start_date: '2026-08-03',
  time: '10:00',
  hours: 2,
  service_type: 'Standard Cleaning',
  client_id: 'client-a',
}

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/client/recurring', {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN_A}` },
    body: JSON.stringify(body),
  })
}

describe('client/recurring POST — terminated-crew guard', () => {
  it('BLOCKED: cleaner_id pointed at a terminated team member 400s, no schedule/bookings/preferred-cleaner write', async () => {
    const res = await POST(req({ ...validBody, cleaner_id: 'tm-terminated' }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
    expect(h.capture.updates.find((u) => u.table === 'clients')).toBeUndefined()
    expect(h.seed.clients.find((c) => c.id === 'client-a')!.preferred_team_member_id).toBeNull()
  })

  it('BLOCKED: a terminated id in extra_cleaner_ids also rejects the whole request', async () => {
    const res = await POST(req({ ...validBody, cleaner_id: 'tm-active', extra_cleaner_ids: ['tm-terminated'] }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'recurring_schedules')).toBeUndefined()
  })

  it('CONTROL: an active cleaner_id still succeeds and is applied to the series', async () => {
    const res = await POST(req({ ...validBody, cleaner_id: 'tm-active' }))
    expect(res.status).toBe(200)
    const scheduleIns = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(scheduleIns!.rows.every((r) => r.team_member_id === 'tm-active')).toBe(true)
    expect(h.seed.clients.find((c) => c.id === 'client-a')!.preferred_team_member_id).toBe('tm-active')
  })

  it('WRONG-TENANT PROBE: a same-id member terminated only in ANOTHER tenant is not blocked here', async () => {
    h.seed.hr_employee_profiles.push({ id: 'p3', tenant_id: 'tid-OTHER', team_member_id: 'tm-active', hr_status: 'terminated' })
    const res = await POST(req({ ...validBody, cleaner_id: 'tm-active' }))
    expect(res.status).toBe(200)
  })
})
