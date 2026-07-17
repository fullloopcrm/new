import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/[id] — reassigning a booking away from one tech to
 * another only ever SMS'd the NEW assignee (the pre-existing "Team member
 * assigned/reassigned" block below). The tech who HAD the job was never
 * told it was taken away — same "silently vanished" shape item (17) already
 * fixed for outright cancellation, here on the reassignment path. Proves:
 * the outgoing tech gets a removal SMS, the incoming tech still gets their
 * existing assignment SMS, and a first-time assignment (no prior tech) or a
 * no-op update (tech unchanged) fires neither/only-the-existing branch.
 */

const holder = vi.hoisted(() => ({
  smsCalls: [] as Array<Record<string, unknown>>,
  oldTeamMemberId: null as string | null,
}))

const TENANT_ID = 'tid-a'
const BOOKING_ID = 'bk-1'
const OLD_TECH_ID = 'tech-old'
const NEW_TECH_ID = 'tech-new'
const TENANT = { id: TENANT_ID, name: 'Test Tenant', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }
const CLIENT_FIXTURE = { name: 'Alice', phone: '+15551234567', address: null, email: null, sms_consent: true }
const NEW_TECH_FIXTURE = { name: 'New Tech', phone: '+15559999999' }
const OLD_TECH_ROW = { id: OLD_TECH_ID, phone: '+15551110000' }

vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Record<string, unknown>) => { holder.smsCalls.push(args); return {} }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'sms body', reschedule: () => 'sms body', cancellation: () => 'sms body' }) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({ jobAssignment: () => 'you got a new job' }) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({})) }))

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    not: () => c,
    single: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return c
}

function bookingsChain() {
  let updated = false
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    not: () => c,
    update: () => { updated = true; return c },
    single: async () => {
      if (updated) {
        return {
          data: {
            id: BOOKING_ID,
            client_id: 'client-a',
            start_time: '2026-08-10T10:00:00.000Z',
            clients: CLIENT_FIXTURE,
            team_members: NEW_TECH_FIXTURE,
          },
          error: null,
        }
      }
      // Pre-update snapshot for change detection.
      return {
        data: {
          status: 'scheduled',
          team_member_id: holder.oldTeamMemberId,
          start_time: '2026-08-10T10:00:00.000Z',
          client_id: 'client-a',
          clients: CLIENT_FIXTURE,
        },
        error: null,
      }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return chain({ data: TENANT, error: null })
      if (table === 'bookings') return bookingsChain()
      // Serves both the FK-injection existence check (select('id')) and this
      // fix's own removal-SMS lookup (select('phone')) — same fixed row.
      if (table === 'team_members') return chain({ data: OLD_TECH_ROW, error: null })
      return chain({ data: null, error: null })
    },
  },
}))

import { PUT } from './route'

function putReq(body: Record<string, unknown>) {
  return PUT(
    new Request(`http://x/api/bookings/${BOOKING_ID}`, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: BOOKING_ID }) },
  )
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  holder.smsCalls.length = 0
  holder.oldTeamMemberId = null
})

describe('PUT /api/bookings/[id] — reassignment notifies the outgoing tech', () => {
  it('SMS both the outgoing tech (removal) and the incoming tech (assignment) on a true reassignment', async () => {
    holder.oldTeamMemberId = OLD_TECH_ID
    const res = await putReq({ team_member_id: NEW_TECH_ID, force: true })
    expect(res.status).toBe(200)
    await flush()
    const recipients = holder.smsCalls.map((c) => c.to)
    expect(recipients).toContain(OLD_TECH_ROW.phone)
    expect(recipients).toContain(NEW_TECH_FIXTURE.phone)
    const removalMsg = holder.smsCalls.find((c) => c.to === OLD_TECH_ROW.phone)
    expect(String(removalMsg?.body)).toMatch(/reassigned/i)
  })

  it('does NOT send a removal SMS on a first-time assignment (no prior tech)', async () => {
    holder.oldTeamMemberId = null
    const res = await putReq({ team_member_id: NEW_TECH_ID, force: true })
    expect(res.status).toBe(200)
    await flush()
    const recipients = holder.smsCalls.map((c) => c.to)
    expect(recipients).not.toContain(OLD_TECH_ROW.phone)
    expect(recipients).toContain(NEW_TECH_FIXTURE.phone)
  })

  it('does NOT send a removal SMS when the assigned tech is unchanged', async () => {
    holder.oldTeamMemberId = NEW_TECH_ID
    const res = await putReq({ team_member_id: NEW_TECH_ID, force: true })
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(0)
  })

  it('SMS the outgoing tech an "unassigned" notice on an explicit unassign (team_member_id: null)', async () => {
    holder.oldTeamMemberId = OLD_TECH_ID
    const res = await putReq({ team_member_id: null, force: true })
    expect(res.status).toBe(200)
    await flush()
    const recipients = holder.smsCalls.map((c) => c.to)
    expect(recipients).toContain(OLD_TECH_ROW.phone)
    const removalMsg = holder.smsCalls.find((c) => c.to === OLD_TECH_ROW.phone)
    expect(String(removalMsg?.body)).toMatch(/unassigned/i)
    // No incoming-assignment SMS to send — there is no new assignee.
    expect(recipients).not.toContain(NEW_TECH_FIXTURE.phone)
  })
})
