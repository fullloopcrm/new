import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT/DELETE /api/bookings/[id] — the operator/admin booking-edit and
 * -cancel routes send the client a "booking confirmed" / "rescheduled" /
 * "cancelled" SMS directly via the bare `@/lib/sms` wrapper, never checking
 * `clients.sms_consent` — the codebase-wide TCPA convention items
 * (19)/(21)/(23)/(31)/(33) already established for every client-self-service
 * booking path. An admin confirming/cancelling a booking on behalf of a
 * client who texted STOP would still trigger these texts. Proves the fix on
 * both the PUT (confirmation) and DELETE (cancellation) code paths:
 * sms_consent:false suppresses the send, true/unset still sends.
 */

const holder = vi.hoisted(() => ({
  smsCalls: [] as Array<Record<string, unknown>>,
  clientSmsConsent: true as boolean | null,
}))

const TENANT_ID = 'tid-a'
const BOOKING_ID = 'bk-1'
const TENANT = { id: TENANT_ID, name: 'Test Tenant', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }
const CLIENT_FIXTURE = { name: 'Alice', phone: '+15551234567', address: null, email: null, get sms_consent() { return holder.clientSmsConsent } }

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
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({ jobAssignment: () => 'team sms' }) }))
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
  let deleted = false
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    not: () => c,
    update: () => { updated = true; return c },
    delete: () => { deleted = true; return c },
    single: async () => {
      if (updated) {
        return {
          data: {
            id: BOOKING_ID,
            client_id: 'client-a',
            start_time: '2026-08-10T10:00:00.000Z',
            clients: CLIENT_FIXTURE,
            team_members: null,
          },
          error: null,
        }
      }
      // Pre-update snapshot (change detection) or delete's pre-fetch — status
      // 'pending' so PUT's statusChanged->'scheduled' branch fires; DELETE
      // reads the same shape via its own separate select.
      return {
        data: {
          status: 'pending',
          team_member_id: null,
          start_time: '2026-08-09T10:00:00.000Z',
          client_id: 'client-a',
          clients: CLIENT_FIXTURE,
        },
        error: null,
      }
    },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      const result = deleted ? { data: [{ id: BOOKING_ID }], error: null } : { data: null, error: null }
      return Promise.resolve(result).then(res, rej)
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return chain({ data: TENANT, error: null })
      if (table === 'bookings') return bookingsChain()
      return chain({ data: null, error: null })
    },
  },
}))

import { PUT, DELETE } from './route'

function putReq(body: Record<string, unknown>) {
  return PUT(
    new Request(`http://x/api/bookings/${BOOKING_ID}`, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: BOOKING_ID }) },
  )
}

function deleteReq() {
  return DELETE(
    new Request(`http://x/api/bookings/${BOOKING_ID}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id: BOOKING_ID }) },
  )
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  holder.smsCalls.length = 0
  holder.clientSmsConsent = true
})

describe('PUT /api/bookings/[id] — booking-confirmed SMS honors sms_consent', () => {
  it('skips the confirmation SMS for a client who has opted out (sms_consent:false)', async () => {
    holder.clientSmsConsent = false
    const res = await putReq({ status: 'scheduled', force: true })
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(0)
  })

  it('sends the confirmation SMS for a client who has not opted out (positive control)', async () => {
    holder.clientSmsConsent = true
    const res = await putReq({ status: 'scheduled', force: true })
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(1)
    expect(holder.smsCalls[0].to).toBe('+15551234567')
  })
})

describe('DELETE /api/bookings/[id] — cancellation SMS honors sms_consent', () => {
  it('skips the cancellation SMS for a client who has opted out (sms_consent:false)', async () => {
    holder.clientSmsConsent = false
    const res = await deleteReq()
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(0)
  })

  it('sends the cancellation SMS for a client who has not opted out (positive control)', async () => {
    holder.clientSmsConsent = true
    const res = await deleteReq()
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(1)
    expect(holder.smsCalls[0].to).toBe('+15551234567')
  })
})
