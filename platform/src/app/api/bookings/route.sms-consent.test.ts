import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings — the operator/admin booking-creation route (used by
 * BookingsAdmin.tsx's manual create flow, including the "Emergency /
 * Same-Day" path) sends the client a "booking confirmed" SMS directly via
 * the bare `@/lib/sms` wrapper, never checking `clients.sms_consent` — the
 * codebase-wide TCPA convention items (19)/(21)/(23)/(31)/(33) already
 * established for every client-self-service booking path. A client who
 * texted STOP but is later booked by an admin/agent (phone-in booking,
 * reused contact) would still get this text. Proves the fix:
 * sms_consent:false suppresses the send, true/unset still sends.
 */

const holder = vi.hoisted(() => ({
  smsCalls: [] as Array<Record<string, unknown>>,
  clientSmsConsent: true as boolean | null,
}))

const TENANT_ID = 'tid-a'
const CLIENT_A = '22222222-2222-2222-2222-222222222222'
const TENANT = { id: TENANT_ID, name: 'Test Tenant', slug: 't', industry: 'cleaning', phone: null, website_url: null, domain: null, domain_name: null, google_place_id: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000' }

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ require_team_member: false, auto_confirm_bookings: false, default_booking_status: 'scheduled', booking_buffer_minutes: 0 }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/day-availability', () => ({ slotWithinHours: () => true, hoursWindowForDate: () => null }))
vi.mock('@/lib/cleaner-availability', () => ({ timestampToMin: () => 600 }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Record<string, unknown>) => { holder.smsCalls.push(args); return {} }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'sms body' }) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({ jobAssignment: () => 'team sms' }) }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/schedule/duration-class', () => ({ deriveDurationClass: () => null }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({})) }))

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    not: () => c,
    lt: () => c,
    gt: () => c,
    gte: () => c,
    lte: () => c,
    in: () => c,
    insert: () => c,
    single: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return chain({ data: TENANT, error: null })
      if (table === 'clients') return chain({ data: { id: CLIENT_A }, error: null })
      if (table === 'bookings') {
        return chain({
          data: {
            id: 'bk-1',
            start_time: '2026-08-10T10:00:00.000Z',
            client_id: CLIENT_A,
            clients: { name: 'Alice', phone: '+15551234567', address: null, sms_consent: holder.clientSmsConsent },
            team_members: null,
          },
          error: null,
        })
      }
      return chain({ data: null, error: null })
    },
  },
}))

import { POST } from './route'

function createReq() {
  return POST(
    new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT_A, start_time: '2026-08-10T10:00:00.000Z', force: true }),
    }),
  )
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  holder.smsCalls.length = 0
  holder.clientSmsConsent = true
})

describe('POST /api/bookings — booking-confirmation SMS honors sms_consent', () => {
  it('skips the confirmation SMS for a client who has opted out (sms_consent:false)', async () => {
    holder.clientSmsConsent = false
    const res = await createReq()
    expect(res.status).toBe(201)
    await flush()
    expect(holder.smsCalls.length).toBe(0)
  })

  it('sends the confirmation SMS for a client who has not opted out (positive control)', async () => {
    holder.clientSmsConsent = true
    const res = await createReq()
    expect(res.status).toBe(201)
    await flush()
    expect(holder.smsCalls.length).toBe(1)
    expect(holder.smsCalls[0].to).toBe('+15551234567')
  })
})
